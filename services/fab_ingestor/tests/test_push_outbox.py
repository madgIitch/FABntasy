import inspect
import urllib.error

import pytest

from fab_ingestor import push_outbox


def test_worker_contract_is_durable_and_concurrency_safe():
    source = inspect.getsource(push_outbox._claim_batch)
    assert "FOR UPDATE SKIP LOCKED" in source
    assert 'payload["eventKey"] = event_key' in source
    assert push_outbox.SWEEP_SECONDS == 60
    assert push_outbox.BACKOFF_SECONDS == (60, 300, 900)
    assert push_outbox.MAX_ATTEMPTS == 3


def test_psycopg_url_drops_prisma_options_and_preserves_tls():
    source = "postgresql://user:pass@db.example:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
    assert push_outbox.psycopg_database_url(source) == "postgresql://user:pass@db.example:6543/postgres?sslmode=require"


def test_settings_require_distinct_secrets_and_https(monkeypatch):
    values = {"DATABASE_URL": "postgresql://db", "CANASTIO_PUSH_DISPATCH_URL": "https://web.example/dispatch",
              "CANASTIO_PUSH_JOB_SECRET": "same", "CANASTIO_PUSH_WAKE_SECRET": "same"}
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    with pytest.raises(ValueError, match="distinct"):
        push_outbox.PushWorkerSettings.from_env()


def test_settings_reject_short_secrets(monkeypatch):
    values = {"DATABASE_URL": "postgresql://db", "CANASTIO_PUSH_DISPATCH_URL": "https://web.example/dispatch",
              "CANASTIO_PUSH_JOB_SECRET": "a" * 31, "CANASTIO_PUSH_WAKE_SECRET": "b" * 31}
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    with pytest.raises(ValueError, match="at least 32"):
        push_outbox.PushWorkerSettings.from_env()


def test_dispatch_classifies_transient_and_permanent_without_error_text(monkeypatch):
    def unavailable(*_args, **_kwargs):
        raise urllib.error.HTTPError("https://redacted.invalid", 503, "sensitive", {}, None)
    monkeypatch.setattr(push_outbox.urllib.request, "urlopen", unavailable)
    assert push_outbox._dispatch("https://web.example/dispatch", "secret", {"intent": "ROUND_RESULT"}) == (False, True, "HTTP_5XX")

    def forbidden(*_args, **_kwargs):
        raise urllib.error.HTTPError("https://redacted.invalid", 400, "sensitive", {}, None)
    monkeypatch.setattr(push_outbox.urllib.request, "urlopen", forbidden)
    assert push_outbox._dispatch("https://web.example/dispatch", "secret", {}) == (False, False, "HTTP_400")
