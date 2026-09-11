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
    scheduler_idle_minutes: int
    scheduler_active_seconds: int
    journey_windows: str
    request_timeout_seconds: float
    retry_attempts: int
    retry_initial_delay_seconds: float
    retry_max_delay_seconds: float
    circuit_failure_threshold: int
    circuit_recovery_seconds: float
    fantasy_lifecycle_url: str | None
    internal_job_secret: str | None
    auto_refresh_credentials: bool

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
        idle_minutes = int(os.getenv("FAB_SCHEDULER_IDLE_MINUTES", "120"))
        active_seconds = int(os.getenv("FAB_SCHEDULER_ACTIVE_SECONDS", "30"))
        journey_windows = os.getenv(
            "FAB_JOURNEY_WINDOWS",
            "FRI 18:00-23:59,SAT 08:00-23:59,SUN 08:00-23:00",
        )
        request_timeout_seconds = float(os.getenv("FAB_REQUEST_TIMEOUT_SECONDS", "10"))
        retry_attempts = int(os.getenv("FAB_RETRY_ATTEMPTS", "3"))
        retry_initial_delay = float(os.getenv("FAB_RETRY_INITIAL_DELAY_SECONDS", "1"))
        retry_max_delay = float(os.getenv("FAB_RETRY_MAX_DELAY_SECONDS", "8"))
        circuit_threshold = int(os.getenv("FAB_CIRCUIT_FAILURE_THRESHOLD", "3"))
        circuit_recovery = float(os.getenv("FAB_CIRCUIT_RECOVERY_SECONDS", "300"))
        fantasy_lifecycle_url = os.getenv("CANASTIO_FANTASY_LIFECYCLE_URL") or None
        internal_job_secret = os.getenv("CANASTIO_INTERNAL_JOB_SECRET") or None
        auto_refresh_credentials = os.getenv("FAB_AUTO_CREDENTIAL_REFRESH", "true").lower() in {"1", "true", "yes"}
        if fantasy_lifecycle_url and not internal_job_secret:
            raise ValueError("CANASTIO_INTERNAL_JOB_SECRET is required when CANASTIO_FANTASY_LIFECYCLE_URL is configured")
        if not 60 <= idle_minutes <= 180:
            raise ValueError("FAB_SCHEDULER_IDLE_MINUTES must be between 60 and 180")
        if not 30 <= active_seconds <= 900:
            raise ValueError("FAB_SCHEDULER_ACTIVE_SECONDS must be between 30 and 900")
        if not 1 <= request_timeout_seconds <= 30:
            raise ValueError("FAB_REQUEST_TIMEOUT_SECONDS must be between 1 and 30")
        if not 1 <= retry_attempts <= 5:
            raise ValueError("FAB_RETRY_ATTEMPTS must be between 1 and 5")
        if not 0 <= retry_initial_delay <= retry_max_delay <= 60:
            raise ValueError("FAB retry delays must satisfy 0 <= initial <= max <= 60")
        if not 1 <= circuit_threshold <= 10:
            raise ValueError("FAB_CIRCUIT_FAILURE_THRESHOLD must be between 1 and 10")
        if not 30 <= circuit_recovery <= 3600:
            raise ValueError("FAB_CIRCUIT_RECOVERY_SECONDS must be between 30 and 3600")
        return cls(
            os.getenv("DATABASE_URL", ""),
            device_id,
            key,
            mode,
            credentials_file,
            idle_minutes,
            active_seconds,
            journey_windows,
            request_timeout_seconds,
            retry_attempts,
            retry_initial_delay,
            retry_max_delay,
            circuit_threshold,
            circuit_recovery,
            fantasy_lifecycle_url,
            internal_job_secret,
            auto_refresh_credentials,
        )
