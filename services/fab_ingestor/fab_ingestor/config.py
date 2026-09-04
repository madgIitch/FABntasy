import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_url: str
    device_id: str | None
    key: str | None
    mode: str
    credentials_file: Path

    @classmethod
    def from_env(cls) -> "Settings":
        mode = os.getenv("INGESTOR_MODE", "mock").lower()
        if mode not in {"mock", "live"}:
            raise ValueError("INGESTOR_MODE must be 'mock' or 'live'")
        device_id = os.getenv("FAB_DEVICE_ID") or None
        key = os.getenv("FAB_KEY") or None
        credentials_file = Path(os.getenv("FAB_CREDENTIALS_FILE", ".local/fab-credentials.json"))
        has_environment_credentials = bool(device_id and key)
        if mode == "live" and not has_environment_credentials and not credentials_file.is_file():
            raise ValueError("live mode requires server-side FAB credentials")
        return cls(os.getenv("DATABASE_URL", ""), device_id, key, mode, credentials_file)
