"""Durable push-outbox worker with authenticated wake-up and 60s recovery sweep."""
from __future__ import annotations

import hmac
import json
import os
import threading
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import psycopg

BACKOFF_SECONDS = (60, 300, 900)
MAX_ATTEMPTS = 3
SWEEP_SECONDS = 60
CLAIM_LEASE_SECONDS = 300


@dataclass(frozen=True)
class PushWorkerSettings:
    database_url: str
    dispatch_url: str
    job_secret: str
    wake_secret: str
    port: int = 8080

    @classmethod
    def from_env(cls) -> PushWorkerSettings:
        values = {name: os.getenv(name, "").strip() for name in (
            "DATABASE_URL", "CANASTIO_PUSH_DISPATCH_URL", "CANASTIO_PUSH_JOB_SECRET", "CANASTIO_PUSH_WAKE_SECRET")}
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise ValueError(f"missing push worker configuration: {','.join(missing)}")
        if values["CANASTIO_PUSH_JOB_SECRET"] == values["CANASTIO_PUSH_WAKE_SECRET"]:
            raise ValueError("push job and wake secrets must be distinct")
        if len(values["CANASTIO_PUSH_JOB_SECRET"]) < 32 or len(values["CANASTIO_PUSH_WAKE_SECRET"]) < 32:
            raise ValueError("push job and wake secrets must contain at least 32 characters")
        if not values["CANASTIO_PUSH_DISPATCH_URL"].startswith("https://"):
            raise ValueError("CANASTIO_PUSH_DISPATCH_URL must use HTTPS")
        return cls(values["DATABASE_URL"], values["CANASTIO_PUSH_DISPATCH_URL"],
                   values["CANASTIO_PUSH_JOB_SECRET"], values["CANASTIO_PUSH_WAKE_SECRET"],
                   int(os.getenv("PORT", "8080")))


def _claim_batch(connection: psycopg.Connection, limit: int = 50) -> list[tuple[str, dict]]:
    with connection.transaction(), connection.cursor() as cursor:
        cursor.execute("""
          WITH candidates AS (
            SELECT id FROM push_outbox_events
            WHERE status IN ('PENDING','RETRYABLE','PROCESSING')
              AND next_attempt_at <= CURRENT_TIMESTAMP AND attempt_count < %s
              AND (claimed_at IS NULL OR claimed_at <= CURRENT_TIMESTAMP - (%s * INTERVAL '1 second'))
            ORDER BY next_attempt_at, created_at
            FOR UPDATE SKIP LOCKED LIMIT %s
          )
          UPDATE push_outbox_events event SET status='PROCESSING', claimed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
          FROM candidates WHERE event.id=candidates.id
          RETURNING event.id::text,event.event_key,event.payload
        """, (MAX_ATTEMPTS, CLAIM_LEASE_SECONDS, limit))
        rows = []
        for event_id, event_key, stored_payload in cursor.fetchall():
            payload = dict(stored_payload)
            payload["eventKey"] = event_key
            rows.append((event_id, payload))
        return rows


def _dispatch(url: str, secret: str, payload: dict, timeout: float = 15) -> tuple[bool, bool, str | None]:
    request = urllib.request.Request(url, data=json.dumps(payload, separators=(",", ":")).encode(), method="POST",
                                     headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return 200 <= response.status < 300, False, None
    except urllib.error.HTTPError as error:
        transient = error.code in (408, 425, 429) or error.code >= 500
        return False, transient, "HTTP_5XX" if error.code >= 500 else f"HTTP_{error.code}"
    except (urllib.error.URLError, TimeoutError):
        return False, True, "NETWORK_ERROR"


def _finish(connection: psycopg.Connection, event_id: str, delivered: bool, transient: bool, error_code: str | None) -> None:
    with connection.transaction(), connection.cursor() as cursor:
        cursor.execute("SELECT attempt_count FROM push_outbox_events WHERE id=%s::uuid FOR UPDATE", (event_id,))
        row = cursor.fetchone()
        if row is None:
            return
        attempts = row[0] + 1
        if delivered:
            cursor.execute("""UPDATE push_outbox_events SET status='DELIVERED',attempt_count=%s,delivered_at=CURRENT_TIMESTAMP,
              claimed_at=NULL,last_error_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=%s::uuid""", (attempts, event_id))
        elif transient and attempts < MAX_ATTEMPTS:
            delay = BACKOFF_SECONDS[attempts - 1]
            cursor.execute("""UPDATE push_outbox_events SET status='RETRYABLE',attempt_count=%s,
              next_attempt_at=CURRENT_TIMESTAMP+(%s*INTERVAL '1 second'),claimed_at=NULL,last_error_code=%s,updated_at=CURRENT_TIMESTAMP
              WHERE id=%s::uuid""", (attempts, delay, error_code, event_id))
        else:
            cursor.execute("""UPDATE push_outbox_events SET status='FAILED',attempt_count=%s,claimed_at=NULL,
              last_error_code=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s::uuid""", (attempts, error_code or "DISPATCH_FAILED", event_id))


class PushOutboxWorker:
    def __init__(self, settings: PushWorkerSettings, wake: threading.Event | None = None,
                 connect: Callable[..., psycopg.Connection] = psycopg.connect):
        self.settings, self.wake, self.connect = settings, wake or threading.Event(), connect

    def drain(self) -> int:
        processed = 0
        with self.connect(self.settings.database_url) as connection:
            while batch := _claim_batch(connection):
                for event_id, payload in batch:
                    delivered, transient, code = _dispatch(self.settings.dispatch_url, self.settings.job_secret, payload)
                    _finish(connection, event_id, delivered, transient, code)
                    processed += 1
        if processed:
            print(json.dumps({"event": "push_outbox_batch", "processed": processed}), flush=True)
        return processed

    def run(self, stop: threading.Event) -> None:
        self.drain()  # startup recovery
        while not stop.is_set():
            self.wake.wait(SWEEP_SECONDS)
            self.wake.clear()
            if not stop.is_set():
                self.drain()


def serve_wakeups(settings: PushWorkerSettings, wake: threading.Event, stop: threading.Event) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            supplied = self.headers.get("Authorization", "").removeprefix("Bearer ")
            authorized = self.path == "/internal/push/wake" and hmac.compare_digest(supplied, settings.wake_secret)
            if authorized:
                wake.set()
            self.send_response(202 if authorized else 401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"accepted":true}' if authorized else b'{"error":"UNAUTHORIZED"}')

        def log_message(self, _format: str, *_args: object) -> None:
            return

    server = ThreadingHTTPServer(("0.0.0.0", settings.port), Handler)
    threading.Thread(target=server.serve_forever, name="push-wake-http", daemon=True).start()
    threading.Thread(target=lambda: (stop.wait(), server.shutdown()), name="push-wake-stop", daemon=True).start()
    return server


def run_push_worker() -> None:
    settings, wake, stop = PushWorkerSettings.from_env(), threading.Event(), threading.Event()
    import signal

    def request_stop(*_args: object) -> None:
        stop.set()
        wake.set()

    for name in (signal.SIGINT, signal.SIGTERM):
        signal.signal(name, request_stop)
    server = serve_wakeups(settings, wake, stop)
    try:
        PushOutboxWorker(settings, wake).run(stop)
    finally:
        server.shutdown()
