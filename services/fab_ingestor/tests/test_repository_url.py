from fab_ingestor.repository import _psycopg_url


def test_psycopg_url_accepts_docker_env_file_quotes():
    quoted = '"postgresql://user:secret@db.example.test:6543/postgres?pgbouncer=true&schema=public"'

    assert _psycopg_url(quoted) == "postgresql://user:secret@db.example.test:6543/postgres"


def test_psycopg_url_accepts_unquoted_url():
    url = "postgresql://user:secret@db.example.test:5432/postgres?sslmode=require"

    assert _psycopg_url(url) == url
