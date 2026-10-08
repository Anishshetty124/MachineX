from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock


@dataclass
class KeyState:
    key: str
    cooldown_until: float = 0.0


class KeyPool:
    """Round-robin pool for authorized provider keys with temporary cooldowns."""

    def __init__(self, raw_keys: str | None, cooldown_seconds: int = 60) -> None:
        keys = [key.strip() for key in (raw_keys or "").split(",") if key.strip()]
        self._keys = [KeyState(key) for key in dict.fromkeys(keys)]
        self._cooldown_seconds = cooldown_seconds
        self._cursor = 0
        self._lock = Lock()

    @property
    def configured(self) -> bool:
        return bool(self._keys)

    @property
    def total(self) -> int:
        return len(self._keys)

    def next_key(self) -> str | None:
        with self._lock:
            if not self._keys:
                return None
            now = time.monotonic()
            for offset in range(len(self._keys)):
                index = (self._cursor + offset) % len(self._keys)
                state = self._keys[index]
                if state.cooldown_until <= now:
                    self._cursor = (index + 1) % len(self._keys)
                    return state.key
            return None

    def cooldown(self, key: str) -> None:
        with self._lock:
            for state in self._keys:
                if state.key == key:
                    state.cooldown_until = time.monotonic() + self._cooldown_seconds
                    break

    def snapshot(self) -> dict[str, int | bool]:
        with self._lock:
            now = time.monotonic()
            available = sum(state.cooldown_until <= now for state in self._keys)
            return {"configured": bool(self._keys), "total": len(self._keys), "available": available}
