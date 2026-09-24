import json
import os
from datetime import UTC, datetime
from pathlib import Path

import pytest

from fab_ingestor.boxscore import sync_game_stats
from fab_ingestor.repository import ExternalIdentityConflict, SportsRepository

DATABASE_URL = os.getenv("FABNTASY_TEST_DATABASE_URL") or os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="requires migrated PostgreSQL test database")


class FixtureStatsClient:
    def __init__(self, payload):
        self.payload = payload

    def get_match_stats(self, match_id, *, payload_sink):
        payload_sink(self.payload)
        return self.payload


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


@pytest.mark.parametrize("roster_first", [True, False])
def test_preseason_roster_and_boxscore_reuse_registration_in_both_orders(roster_first):
    assert DATABASE_URL is not None
    suffix = str(__import__("uuid").uuid4())
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        federation_id = repository.upsert_federation(name=f"Roster Federation {suffix}")
        competition_id = repository.upsert_from_external(
            source="TEST", entity_type="competition", external_id=f"competition-{suffix}",
            values={"federation_id": federation_id, "name": f"Competition {suffix}"},
        )
        season_id = repository.upsert_from_external(
            source="TEST", entity_type="season", external_id=f"season-{suffix}",
            values={"name": f"Season {suffix}"},
        )
        competition_season_id = repository.upsert_from_external(
            source="TEST", entity_type="competition_season", external_id=f"competition-season-{suffix}",
            values={"competition_id": competition_id, "season_id": season_id},
        )
        team_id = repository.upsert_from_external(
            source="TEST", entity_type="team", external_id=f"team-{suffix}",
            values={"name": "CB Ejemplo"},
        )
        registration_id = repository.upsert_from_external(
            source="TEST", entity_type="team_registration", external_id=f"team-registration-{suffix}",
            values={"team_id": team_id, "competition_season_id": competition_season_id},
        )

        def roster():
            return repository.upsert_roster_player(
                competition_season_id=competition_season_id,
                team_registration_id=registration_id, display_name="María Pérez Gómez",
            )[0]

        def boxscore():
            return repository.upsert_player_registration(
                player_external_id=f"component:{suffix}", display_name="MARIA PEREZ GOMEZ",
                provisional=False, team_registration_id=registration_id,
                competition_season_id=competition_season_id, shirt_number="7",
            )[0]

        first = roster() if roster_first else boxscore()
        second = boxscore() if roster_first else roster()
        assert first == second == roster() == boxscore()
        row = repository.connection.execute(
            "SELECT identity_status, roster_seen_at FROM player_registrations WHERE id=%s", (first,)
        ).fetchone()
        assert row[0] == "TENTATIVE"
        assert row[1] is not None
        assert repository.connection.execute(
            "SELECT count(*) FROM player_registrations WHERE team_registration_id=%s",
            (registration_id,),
        ).fetchone()[0] == 1

        new_team_id = repository.upsert_from_external(
            source="TEST", entity_type="team", external_id=f"transfer-team-{suffix}",
            values={"name": "CB Destino"},
        )
        new_team_registration_id = repository.upsert_from_external(
            source="TEST", entity_type="team_registration",
            external_id=f"transfer-registration-{suffix}",
            values={"team_id": new_team_id, "competition_season_id": competition_season_id},
        )
        transferred_registration_id, _ = repository.upsert_player_registration(
            player_external_id=f"component:{suffix}", display_name="María Pérez Gómez",
            provisional=False, team_registration_id=new_team_registration_id,
            competition_season_id=competition_season_id, shirt_number="11",
        )
        assert transferred_registration_id != first
        original_player_id = repository.connection.execute(
            "SELECT player_id FROM player_registrations WHERE id=%s", (first,)
        ).fetchone()[0]
        transferred_player_id = repository.connection.execute(
            "SELECT player_id FROM player_registrations WHERE id=%s", (transferred_registration_id,)
        ).fetchone()[0]
        assert original_player_id == transferred_player_id


def test_fab_team_notification_id_reuses_team_across_two_devices():
    assert DATABASE_URL is not None
    suffix = str(__import__("uuid").uuid4())
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        federation_id = repository.upsert_federation(name=f"Team Federation {suffix}")
        competition_id = repository.upsert_from_external(
            source="TEST", entity_type="competition", external_id=f"competition-{suffix}",
            values={"federation_id": federation_id, "name": f"Competition {suffix}"},
        )
        season_id = repository.upsert_from_external(
            source="TEST", entity_type="season", external_id=f"season-{suffix}",
            values={"name": f"Season {suffix}"},
        )
        competition_season_id = repository.upsert_from_external(
            source="TEST", entity_type="competition_season", external_id=f"competition-season-{suffix}",
            values={"competition_id": competition_id, "season_id": season_id},
        )
        first = repository.upsert_fab_team_registration(
            competition_season_id=competition_season_id, category_competition_id="10027",
            stable_team_id=f"119626-{suffix}", device_team_id="handle-device-a",
            display_name="CB Ejemplo", group_id=None,
        )
        second = repository.upsert_fab_team_registration(
            competition_season_id=competition_season_id, category_competition_id="10027",
            stable_team_id=f"119626-{suffix}", device_team_id="handle-device-b",
            display_name="CB Ejemplo", group_id=None,
        )
        assert first == second
        assert repository.resolve_roster_team_registration(
            competition_season_id, "CB Ejemplo", f"119626-{suffix}"
        ) == first[1]


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


def test_game_external_identity_survives_reprogramming_and_transaction_rolls_back():
    assert DATABASE_URL is not None
    external_game_id = f"integration-game-{__import__('uuid').uuid4()}"
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        federation_id = repository.upsert_federation(name="Integration Federation")
        competition_id = repository.upsert_from_external(
            source="TEST",
            entity_type="competition",
            external_id=f"competition-{external_game_id}",
            values={"federation_id": federation_id, "name": external_game_id},
        )
        season_id = repository.upsert_from_external(
            source="TEST",
            entity_type="season",
            external_id=f"season-{external_game_id}",
            values={"name": external_game_id},
        )
        competition_season_id = repository.upsert_from_external(
            source="TEST",
            entity_type="competition_season",
            external_id=f"competition-season-{external_game_id}",
            values={"competition_id": competition_id, "season_id": season_id},
        )
        group_id = repository.upsert_from_external(
            source="TEST",
            entity_type="group",
            external_id=f"group-{external_game_id}",
            values={"competition_season_id": competition_season_id, "name": external_game_id},
        )
        home_id = repository.upsert_from_external(
            source="TEST",
            entity_type="team",
            external_id=f"home-{external_game_id}",
            values={"name": "Home"},
        )
        away_id = repository.upsert_from_external(
            source="TEST",
            entity_type="team",
            external_id=f"away-{external_game_id}",
            values={"name": "Away"},
        )
        original = datetime(2026, 9, 10, 18, tzinfo=UTC)
        delayed = datetime(2026, 9, 10, 20, tzinfo=UTC)
        values = {
            "competition_season_id": competition_season_id,
            "group_id": group_id,
            "home_team_id": home_id,
            "away_team_id": away_id,
            "scheduled_at": original,
            "status": "scheduled",
            "sync_status": "active",
        }
        first = repository.upsert_from_external(
            source="FAB", entity_type="game", external_id=external_game_id, values=values
        )
        second = repository.upsert_from_external(
            source="FAB",
            entity_type="game",
            external_id=external_game_id,
            values={**values, "scheduled_at": delayed},
        )
        persisted = repository.connection.execute(
            "SELECT scheduled_at FROM games WHERE id = %s", (first,)
        ).fetchone()
        assert first == second
        assert persisted == (delayed,)


def test_boxscore_upsert_is_idempotent_and_corrections_replace_values():
    assert DATABASE_URL is not None
    payload = json.loads(
        (Path(__file__).parent / "fixtures" / "fab_boxscore.json").read_text(encoding="utf-8")
    )
    suffix = str(__import__("uuid").uuid4())
    external_game_id = f"integration-boxscore-{suffix}"
    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        federation_id = repository.upsert_federation(name=f"Boxscore Federation {suffix}")
        competition_id = repository.upsert_from_external(
            source="TEST",
            entity_type="competition",
            external_id=f"competition-{suffix}",
            values={"federation_id": federation_id, "name": f"Competition {suffix}"},
        )
        season_id = repository.upsert_from_external(
            source="TEST",
            entity_type="season",
            external_id=f"season-{suffix}",
            values={"name": f"Season {suffix}"},
        )
        competition_season_id = repository.upsert_from_external(
            source="TEST",
            entity_type="competition_season",
            external_id=f"competition-season-{suffix}",
            values={"competition_id": competition_id, "season_id": season_id},
        )
        team_ids = []
        for side in ("home", "away"):
            team_id = repository.upsert_from_external(
                source="TEST",
                entity_type="team",
                external_id=f"{side}-{suffix}",
                values={"name": f"{side} {suffix}"},
            )
            repository.upsert_from_external(
                source="TEST",
                entity_type="team_registration",
                external_id=f"registration-{side}-{suffix}",
                values={
                    "team_id": team_id,
                    "competition_season_id": competition_season_id,
                },
            )
            team_ids.append(team_id)
        game_id = repository.upsert_from_external(
            source="FAB",
            entity_type="game",
            external_id=external_game_id,
            values={
                "competition_season_id": competition_season_id,
                "home_team_id": team_ids[0],
                "away_team_id": team_ids[1],
                "status": "finished",
                "has_statistics": True,
            },
        )

        first = sync_game_stats(
            FixtureStatsClient(payload), repository, external_game_id=external_game_id
        )
        payload["estadisticas"]["estadisticasequipolocal"][0]["puntos"] = 14
        second = sync_game_stats(
            FixtureStatsClient(payload), repository, external_game_id=external_game_id
        )

        assert (first.players_created, second.players_updated) == (2, 2)
        assert repository.connection.execute(
            "SELECT count(*) FROM player_game_stats WHERE game_id = %s", (game_id,)
        ).fetchone() == (2,)
        assert repository.connection.execute(
            """
            SELECT points FROM player_game_stats
            WHERE game_id = %s ORDER BY points DESC LIMIT 1
            """,
            (game_id,),
        ).fetchone() == (14,)
        assert repository.connection.execute(
            "SELECT stats_sync_status FROM games WHERE id = %s", (game_id,)
        ).fetchone() == ("stats_final",)
        assert external_game_id not in repository.list_eligible_stats_games(
            competition_season_id
        )
        assert external_game_id in repository.list_eligible_stats_games(
            competition_season_id, force=True
        )


def test_advisory_lock_excludes_second_connection_and_run_is_sanitized():
    assert DATABASE_URL is not None
    competition_season_id = __import__("uuid").uuid4()
    with (
        SportsRepository.connect(DATABASE_URL) as first,
        SportsRepository.connect(DATABASE_URL) as second,
        first.advisory_lock("sync_all", competition_season_id) as first_acquired,
        second.advisory_lock("sync_all", competition_season_id) as second_acquired,
    ):
        assert first_acquired is True
        assert second_acquired is False

    with (
        SportsRepository.connect(DATABASE_URL) as repository,
        repository.connection.transaction(force_rollback=True),
    ):
        run_id = repository.start_ingestion_run("integration", None)
        repository.finish_ingestion_run(
            run_id,
            status="failed",
            counters={"attempts": 3},
            error_code="FAB_TRANSPORT",
        )
        row = repository.connection.execute(
            "SELECT status, counters, error_code FROM ingestion_runs WHERE id = %s", (run_id,)
        ).fetchone()
        assert row == ("failed", {"attempts": 3}, "FAB_TRANSPORT")
