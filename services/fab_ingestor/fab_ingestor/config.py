import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    device_id: str | None
    key: str | None
    mode: str

    @classmethod
    def from_env(cls) -> "Settings":
        mode = os.getenv("INGESTOR_MODE", "mock").lower()
        if mode not in {"mock", "live"}:
            raise ValueError("INGESTOR_MODE must be 'mock' or 'live'")
        device_id = os.getenv("FAB_DEVICE_ID") or None
        key = os.getenv("FAB_KEY") or None
        if mode == "live" and (not device_id or not key):
            raise ValueError("live mode requires server-side FAB credentials")
        return cls(os.getenv("DATABASE_URL", ""), device_id, key, mode)
