from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping, Sequence
from typing import Any

SENSITIVE_KEY = re.compile(
    r"(?:authorization|cookie|token|password|secret|key|api[_-]?key|fab[_-]?(?:key|device)|"
    r"id_dispositivo|vapid|p256dh|refresh|access[_-]?token|request[_-]?body)", re.IGNORECASE
)


def sanitize_payload(value: Any) -> Any:
    """Return a copy without secrets, including secrets nested in lists or objects."""
    if isinstance(value, Mapping):
        return {
            str(key): sanitize_payload(item)
            for key, item in value.items()
            if not SENSITIVE_KEY.search(str(key))
        }
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [sanitize_payload(item) for item in value]
    return value


def canonical_payload(value: Any) -> tuple[Any, str]:
    sanitized = sanitize_payload(value)
    encoded = json.dumps(sanitized, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return sanitized, hashlib.sha256(encoded).hexdigest()
