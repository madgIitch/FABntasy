from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

SCHEMA_VERSION = "canastio.observability.v1"
FORBIDDEN = ("token", "cookie", "password", "secret", "authorization", "credential", "key", "device", "dsn", "database_url", "body", "payload", "raw", "email", "user_id", "league", "stack", "query")
ALLOWED_DIMENSIONS = {"jobType", "severity", "threshold", "durationBucket"}

class Sink(Protocol):
    def write(self, signal: dict[str, Any]) -> None: ...

@dataclass
class MemorySink:
    signals: list[dict[str, Any]] = field(default_factory=list)
    def write(self, signal: dict[str, Any]) -> None:
        self.signals.append(dict(signal))

def redact(values: dict[str, Any] | None) -> dict[str, str | int | bool]:
    clean: dict[str, str | int | bool] = {}
    for key, value in (values or {}).items():
        if key in ALLOWED_DIMENSIONS and not any(word in key.lower() for word in FORBIDDEN) and isinstance(value, (str, int, bool)):
            clean[key] = value[:80] if isinstance(value, str) else value
    return clean

class Observability:
    def __init__(self, sink: Sink | None = None, *, enabled: bool = True, release: str = "dev", environment: str = "development", now: Any = None) -> None:
        self.sink, self.enabled, self.release, self.environment = sink, enabled, release[:64], environment[:32]
        self.now = now or (lambda: datetime.now(UTC))
        self.groups: dict[str, dict[str, Any]] = {}

    def emit(self, *, component: str, operation: str, result: str, error_category: str, dimensions: dict[str, Any] | None = None) -> None:
        if not self.enabled or self.sink is None:
            return
        stamp = self.now().astimezone(UTC).isoformat().replace("+00:00", "Z")
        key = hashlib.sha256(f"{component}:{operation}:{error_category}:{self.release}".encode()).hexdigest()[:24]
        previous = self.groups.get(key)
        signal = {"schemaVersion": SCHEMA_VERSION, "timestamp": stamp, "release": self.release, "environment": self.environment, "component": component, "operation": operation[:64], "result": result, "errorCategory": error_category, "dimensions": redact(dimensions), "count": int(previous["count"]) + 1 if previous else 1, "firstSeenAt": previous["firstSeenAt"] if previous else stamp, "lastSeenAt": stamp, "signature": key}
        self.groups[key] = signal
        try:
            self.sink.write(signal)
        except Exception:  # noqa: BLE001 - telemetry boundary must swallow sink failures
            return

def category(error: Exception) -> str:
    name = type(error).__name__.lower()
    if "fab" in name: return "FAB_TRANSPORT"
    if "operational" in name or "database" in name or "psycopg" in name: return "DATABASE"
    return "INGESTOR_FAILURE"
