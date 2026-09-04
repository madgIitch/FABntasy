import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")
    device_id: str = os.getenv("FAB_DEVICE_ID", "")
    fab_key: str = os.getenv("FAB_KEY", "")
    mode: str = os.getenv("INGESTOR_MODE", "mock")

    @property
    def is_mock(self) -> bool:
        return self.mode == "mock"
