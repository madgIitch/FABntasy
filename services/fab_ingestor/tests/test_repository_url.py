from unittest.mock import MagicMock

from fab_ingestor.repository import SportsRepository, _psycopg_url


def test_psycopg_url_accepts_docker_env_file_quotes():
    quoted = '"postgresql://user:secret@db.example.test:6543/postgres?pgbouncer=true&schema=public"'

    assert _psycopg_url(quoted) == "postgresql://user:secret@db.example.test:6543/postgres"


def test_psycopg_url_accepts_unquoted_url():
    url = "postgresql://user:secret@db.example.test:5432/postgres?sslmode=require"

    assert _psycopg_url(url) == url


def test_repository_disables_prepared_statements_for_transaction_poolers(monkeypatch):
    connect = MagicMock()
    monkeypatch.setattr("fab_ingestor.repository.psycopg.connect", connect)

    with SportsRepository.connect("postgresql://db.example.test/app"):
        pass

    connect.assert_called_once_with(
        "postgresql://db.example.test/app",
        autocommit=True,
        prepare_threshold=None,
    )
