import os

import pytest

from fab_ingestor.repository import ExternalIdentityConflict, SportsRepository

DATABASE_URL = os.getenv("FABNTASY_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="requires migrated PostgreSQL test database")


def test_external_upsert_is_idempotent_and_conflicts_are_rejected():
    assert DATABASE_URL is not None
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        first = repository.upsert_from_external(
            source="FAB",
            entity_type="team",
            external_id="integration-team-1",
            values={"name": "Original"},
        )
        second = repository.upsert_from_external(
            source="FAB",
            entity_type="team",
            external_id="integration-team-1",
            values={"name": "Updated"},
        )
        assert first == second

        with pytest.raises(ExternalIdentityConflict):
            repository.upsert_external_id(
                source="FAB",
                entity_type="team",
                external_id="integration-team-1",
                entity_id=__import__("uuid").uuid4(),
            )


def test_raw_payload_is_sanitized_and_deduplicated():
    assert DATABASE_URL is not None
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        first = repository.save_raw_payload(
            endpoint="integration-test",
            entity_type="team",
            external_id="1",
            http_status=200,
            payload={"name": "Team", "key": "secret-one"},
        )
        second = repository.save_raw_payload(
            endpoint="integration-test",
            entity_type="team",
            external_id="1",
            http_status=200,
            payload={"key": "secret-two", "name": "Team"},
        )
        assert first == second
