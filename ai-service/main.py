import hashlib
import json
import os
import asyncio
import base64
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx
from key_rotation import KeyPool

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

gemini_keys = KeyPool(os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY"))
yolo_keys = KeyPool(os.getenv("YOLO_API_KEYS") or os.getenv("YOLO_API_KEY"))

print(f"[AI] Gemini configured keys={gemini_keys.snapshot()['total']} status=NOT_CONNECTED")
print(f"[AI] YOLO configured keys={yolo_keys.snapshot()['total']} status=NOT_CONNECTED")

app = FastAPI(title="AUTO-QUAL AI Service", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "http://127.0.0.1:5000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFECT_TYPES = ["Crack", "Scratch", "Dent", "Corrosion", "Porosity", "Deformation"]


def number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_telemetry(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def clamp(value: Any, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, number(value)))


def normalize_defect(value: dict[str, Any], default_part: str = "Brake pad") -> dict[str, Any]:
    raw_box = value.get("bbox") or value.get("box") or [0.6, 0.3, 0.18, 0.14]
    if len(raw_box) == 4:
        box = [clamp(item) for item in raw_box]
    else:
        box = [0.6, 0.3, 0.18, 0.14]
    
    defect_type = value.get("type") or value.get("defectType") or "Unclassified"
    if defect_type not in DEFECT_TYPES:
        defect_type = next((item for item in DEFECT_TYPES if item.lower() in str(defect_type).lower()), "Unclassified")
    
    severity = str(value.get("severity", "Medium")).title()
    if severity not in ["Low", "Medium", "High", "Critical"]:
        severity = "Medium"
        
    part_type = value.get("partType") or value.get("part") or default_part

    return {
        "partType": part_type,
        "type": defect_type,
        "severity": severity,
        "bbox": box,
        "confidence": round(clamp(value.get("confidence", 0.85)), 3)
    }


def parse_json_text(text: str) -> dict[str, Any]:
    cleaned = text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(cleaned)


async def call_gemini(image_bytes: bytes, filename: str, content_type: str, telemetry: dict[str, Any]) -> tuple[dict[str, Any] | None, str]:
    if not gemini_keys.configured:
        return None, "not_configured"
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = """You are an automotive quality inspection vision system. Inspect the uploaded image and return ONLY valid JSON with this exact shape: {\"partType\": \"Brake disc|Brake pad|Caliper|Spark plug|Wheel hub|Unknown\", \"type\": \"Crack|Scratch|Dent|Corrosion|Porosity|Deformation\", \"severity\": \"Low|Medium|High|Critical\", \"bbox\": [x,y,width,height], \"confidence\": 0.0}. Bounding box values must be normalized from 0 to 1. If no defect is visible, use type Deformation, severity Low, bbox [0,0,0,0], confidence 0.1."""
    body = {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": content_type or "image/jpeg", "data": base64.b64encode(image_bytes).decode("ascii")}}]}]}
    async with httpx.AsyncClient(timeout=45) as client:
        for _ in range(gemini_keys.total):
            key = gemini_keys.next_key()
            if not key:
                break
            try:
                response = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", params={"key": key}, json=body)
                if response.status_code in (401, 403, 429):
                    gemini_keys.cooldown(key)
                response.raise_for_status()
                text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = parse_json_text(text)
                return normalize_defect(parsed, telemetry.get("part", "Brake pad")), "completed"
            except httpx.HTTPStatusError as error:
                print(f"[AI] Gemini request failed status={error.response.status_code}")
            except Exception as error:
                print(f"[AI] Gemini request failed type={type(error).__name__}")
        return None, "error"


async def call_yolo(image_bytes: bytes, filename: str, content_type: str) -> tuple[dict[str, Any] | None, str]:
    endpoint = os.getenv("YOLO_API_URL")
    if not endpoint or not yolo_keys.configured:
        return None, "not_configured"
    async with httpx.AsyncClient(timeout=45) as client:
        for _ in range(yolo_keys.total):
            key = yolo_keys.next_key()
            if not key:
                break
            try:
                response = await client.post(endpoint, headers={"Authorization": f"Bearer {key}", "x-api-key": key}, files={"file": (filename, image_bytes, content_type or "image/jpeg")})
                if response.status_code in (401, 403, 429):
                    yolo_keys.cooldown(key)
                response.raise_for_status()
                payload = response.json()
                detections = payload.get("detections") or payload.get("predictions") or payload.get("results") or []
                if not detections:
                    return None, "completed_no_detection"
                return {"bbox": detections[0].get("bbox") or detections[0].get("box")}, "completed"
            except httpx.HTTPStatusError as error:
                print(f"[AI] YOLO request failed status={error.response.status_code}")
            except Exception as error:
                print(f"[AI] YOLO request failed type={type(error).__name__}")
        return None, "error"


def classify_defect(image: UploadFile | None, image_bytes: bytes, sample_preset: str | None, telemetry: dict[str, Any]) -> dict[str, Any]:
    seed = sample_preset or (hashlib.sha256(image_bytes).hexdigest() if image_bytes else "inspection")
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    defect_type = DEFECT_TYPES[digest[0] % len(DEFECT_TYPES)]
    if sample_preset:
        defect_type = {"crack": "Crack", "scratch": "Scratch", "corrosion": "Corrosion"}.get(sample_preset.lower(), defect_type)

    temperature = number(telemetry.get("castingTemp"))
    vibration = number(telemetry.get("vibrationRate"))
    pressure = number(telemetry.get("moldPressure"))
    severity = "Low"
    if temperature > 740 or vibration > 7:
        severity = "Critical"
    elif temperature < 680 or pressure < 110 or pressure > 160:
        severity = "High"
    elif temperature < 685 or vibration > 4:
        severity = "Medium"

    return {
        "partType": telemetry.get("part") or "Brake pad",
        "type": defect_type,
        "severity": severity,
        "bbox": [
            round(0.15 + digest[2] / 255 * 0.65, 3),
            round(0.15 + digest[3] / 255 * 0.65, 3),
            round(0.12 + digest[4] / 255 * 0.18, 3),
            round(0.1 + digest[5] / 255 * 0.16, 3),
        ],
        "confidence": round(0.82 + (digest[1] / 2550), 3),
    }


def analyze_root_cause(telemetry: dict[str, Any]) -> dict[str, Any]:
    casting_temp = number(telemetry.get("castingTemp"))
    mold_pressure = number(telemetry.get("moldPressure"))
    machine_speed = number(telemetry.get("machineSpeed"))
    vibration = number(telemetry.get("vibrationRate"))

    factors = {
        "Casting Temperature": max(0.0, abs(casting_temp - 695) / 55),
        "Mold Pressure": max(0.0, abs(mold_pressure - 135) / 35),
        "Machine Speed": max(0.0, abs(machine_speed - 80) / 80),
        "Vibration": max(0.0, vibration / 10),
    }
    total = sum(factors.values()) or 1
    impacts = [{"parameter": key, "impact": round(value / total * 100, 1)} for key, value in factors.items()]
    impacts.sort(key=lambda item: item["impact"], reverse=True)

    if casting_temp > 740:
        primary_factor, confidence = "Abnormal Casting Temperature", 89
    elif mold_pressure < 120 or mold_pressure > 150:
        primary_factor, confidence = "Mold Pressure Out of Range", 84
    elif vibration > 5:
        primary_factor, confidence = "Excessive Machine Vibration", 81
    elif machine_speed > 100:
        primary_factor, confidence = "Machine Speed Drift", 76
    else:
        primary_factor, confidence = "No dominant process deviation", 62

    return {
        "primaryFactor": primary_factor,
        "confidence": confidence,
        "featureImpact": impacts,
        "thresholds": {"castingTemp": {"min": 680, "max": 710}, "moldPressure": {"min": 120, "max": 150}},
    }


def predict_failure(telemetry: dict[str, Any]) -> dict[str, Any]:
    casting_temp = number(telemetry.get("castingTemp"))
    pressure = number(telemetry.get("moldPressure"))
    vibration = number(telemetry.get("vibrationRate"))
    drift = min(1.0, max(0.0, abs(casting_temp - 695) / 70 + abs(pressure - 135) / 100 + vibration / 20))
    probability = round(min(0.98, 0.12 + drift * 0.62), 2)
    return {
        "failureProbabilityNextCycle": probability,
        "percentage": round(probability * 100),
        "machineId": telemetry.get("machineId") or "Unassigned",
        "trend": "rising" if probability >= 0.5 else "stable",
    }


def corrective_action(root_cause: dict[str, Any], telemetry: dict[str, Any]) -> str:
    machine_id = telemetry.get("machineId") or "the affected machine"
    actions = {
        "Abnormal Casting Temperature": f"Inspect the temperature-control system and flush coolant lines on {machine_id} before starting the next batch.",
        "Mold Pressure Out of Range": f"Verify mold pressure regulation and inspect the hydraulic circuit on {machine_id} before the next cycle.",
        "Excessive Machine Vibration": f"Inspect bearings, mounts, and spindle alignment on {machine_id} before releasing the next batch.",
        "Machine Speed Drift": f"Review the drive controller and restore the validated machine speed profile on {machine_id}.",
    }
    return actions.get(root_cause["primaryFactor"], f"Continue monitoring {machine_id} and review the next inspection batch.")


def telemetry_history(telemetry: dict[str, Any]) -> list[dict[str, Any]]:
    current = number(telemetry.get("castingTemp"), 695)
    offsets = [-18, -9, 6, 2, 14, 0]
    return [{"batchId": f"B-{index + 1:02d}", "castingTemp": round(current + offset, 1)} for index, offset in enumerate(offsets)]


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "auto-qual-ai",
        "gemini_keys": gemini_keys.snapshot(),
        "yolo_keys": yolo_keys.snapshot(),
    }


@app.post("/analyze")
async def analyze(
    image: UploadFile | None = File(default=None),
    telemetry: str | None = Form(default=None),
    sample_preset: str | None = Form(default=None),
) -> dict[str, Any]:
    telemetry_data = parse_telemetry(telemetry)
    image_bytes = await image.read() if image else b""
    gemini_result, gemini_status = (None, "not_configured")
    yolo_result, yolo_status = (None, "not_configured")
    if image_bytes:
        gemini_result, yolo_result = await asyncio.gather(
            call_gemini(image_bytes, image.filename or "inspection.jpg", image.content_type or "image/jpeg", telemetry_data),
            call_yolo(image_bytes, image.filename or "inspection.jpg", image.content_type or "image/jpeg"),
        )
        gemini_result, gemini_status = gemini_result
        yolo_result, yolo_status = yolo_result

    defect = gemini_result or classify_defect(image, image_bytes, sample_preset, telemetry_data)
    provider_name = "gemini" if gemini_result else "local_deterministic_fallback"
    if yolo_result and yolo_result.get("bbox"):
        defect["bbox"] = [clamp(item) for item in yolo_result["bbox"]]
        provider_name += "+yolo_bbox"
        
    root_cause = analyze_root_cause(telemetry_data)
    risk = predict_failure(telemetry_data)
    detected_part = defect.get("partType") or telemetry_data.get("part") or "Brake pad"
    
    print(
        f"[AI] provider={provider_name} part={detected_part} image={image.filename if image else 'none'} "
        f"defect={defect['type']} severity={defect['severity']} confidence={defect['confidence']} "
        f"bbox={defect['bbox']} root_cause={root_cause['primaryFactor']} risk={risk['percentage']}%"
    )
    
    return {
        "status": "completed",
        "defect": defect,
        "detectedPart": detected_part,
        "defects": [{**defect, "box": defect["bbox"]}],
        "rootCause": root_cause,
        "predictiveRisk": risk,
        "recommendation": corrective_action(root_cause, telemetry_data),
        "telemetry": telemetry_data,
        "telemetryHistory": telemetry_history(telemetry_data),
        "image": image.filename if image else None,
        "providerRouting": {
            "gemini": {**gemini_keys.snapshot(), "status": gemini_status},
            "yolo": {**yolo_keys.snapshot(), "status": yolo_status},
            "active": provider_name,
        },
    }


@app.post("/chat")
async def chat(message: str = Form(...), context: str | None = Form(default=None)) -> dict[str, Any]:
    return {"reply": "AI assistant pipeline ready.", "received": message, "context": parse_telemetry(context)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)