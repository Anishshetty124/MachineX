from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AUTO-QUAL AI Service", version="0.1.0")

# Allow the Express gateway and local Vite development client to call the AI API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    image_url: str | None = None
    inspection_id: str | None = None
    measurements: dict[str, float] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    context: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "auto-qual-ai"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest) -> dict[str, Any]:
    return {
        "status": "queued",
        "inspection_id": request.inspection_id,
        "defects": [],
        "confidence": 0.0,
        "message": "Analysis pipeline ready for a model adapter.",
    }


@app.post("/chat")
async def chat(request: ChatRequest) -> dict[str, Any]:
    return {
        "reply": "AI assistant pipeline ready.",
        "received": request.message,
        "context": request.context,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
