from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from typing import Any

SENSITIVE_KEYS = {"key", "id_dispositivo", "token", "password", "secret"}


def sanitize_payload(value: Any) -> Any:
    """Return a copy without secrets, including secrets nested in lists or objects."""
    if isinstance(value, Mapping):
        return {
            str(key): sanitize_payload(item)
            for key, item in value.items()
            if str(key).casefold() not in SENSITIVE_KEYS
        }
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [sanitize_payload(item) for item in value]
    return value


def canonical_payload(value: Any) -> tuple[Any, str]:
    sanitized = sanitize_payload(value)
    encoded = json.dumps(sanitized, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return sanitized, hashlib.sha256(encoded).hexdigest()
