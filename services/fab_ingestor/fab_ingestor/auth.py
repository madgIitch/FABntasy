from __future__ import annotations

import json
import os
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from .client import Credentials


class FileCredentialStore:
    """Server-side credential store using an atomic same-directory replace."""

    def __init__(self, path: str | Path) -> None:
        self._path = Path(path)

    def load(self) -> Credentials | None:
        if not self._path.exists():
            return None
        data = json.loads(self._path.read_text(encoding="utf-8"))
        device_id, key = data.get("device_id"), data.get("key")
        valid = isinstance(device_id, str) and device_id and isinstance(key, str) and key
        if not valid:
            raise ValueError("credential store contains invalid data")
        return Credentials(device_id, key)

    def replace(self, credentials: Credentials) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=f".{self._path.name}.", dir=self._path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump({"device_id": credentials.device_id, "key": credentials.key}, handle)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self._path)
        except BaseException:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass
            raise

    def assert_writable(self) -> None:
        """Fail before contacting FAB if atomic credential rotation cannot work."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        fd, probe = tempfile.mkstemp(prefix=".fab-write-probe.", dir=self._path.parent)
        os.close(fd)
        os.unlink(probe)

    @contextmanager
    def renewal_lock(self) -> Iterator[None]:
        """Serialize device renewal across workers sharing the credential directory."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self._path.with_suffix(self._path.suffix + ".lock")
        with lock_path.open("a+b") as handle:
            handle.seek(0)
            if handle.tell() == 0:
                handle.write(b"0")
                handle.flush()
            if os.name == "nt":
                import msvcrt

                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
                try:
                    yield
                finally:
                    handle.seek(0)
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
