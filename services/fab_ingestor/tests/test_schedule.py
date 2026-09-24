from contextlib import nullcontext
from uuid import uuid4

import pytest

from fab_ingestor.schedule import (
    ScheduleContractError,
    _parse_fab_datetime,
    sync_competition_games,
)


class FakeClient:
    def get_category_matchdays(self, category, phase, *, group_id, payload_sink):
        payload = {
            "resultado": "correcto",
            "ListaJornadas": [
                {"IdJornada": f"day-{group_id}", "FechaJornada": "/Date(1)/", "NumeroJornada": 1}
            ],
        }
        payload_sink(payload)
        return payload["ListaJornadas"]

    def get_category_matches(self, category, phase, *, group_id, payload_sink):
        payload = {
            "resultado": "correcto",
            "partidos": [
                {
                    "IdPartido": "game-1",
                    "Estado": "No comenzado",
                    "FechaHoraUTC": "/Date(1788981600000)/",
                    "NumeroJornada": 1,
                    "NombreEquipoLocal": "Local",
                    "NombreEquipoVisitante": "Visitante",
                    "Resultados": {
                        "ResultadoLocal": "-",
                        "ResultadoVisitante": "-",
                        "ResultadosPeriodo": [],
                    },
                    "TipoActa": "ESTADÍSTICAS",
                },
                {
                    "IdPartido": "bye",
                    "Estado": "No comenzado",
                    "FechaHoraUTC": "/Date(-2208992400000)/",
                    "NumeroJornada": 1,
                    "NombreEquipoLocal": "DESCANSA",
                    "NombreEquipoVisitante": "Local",
                    "Resultados": None,
                    "TipoActa": "ESTADÍSTICAS",
                },
            ],
        }
        payload_sink(payload)
        return payload["partidos"]


class FailingClient(FakeClient):
    def get_category_matches(self, category, phase, *, group_id, payload_sink):
        raise ScheduleContractError("partial FAB failure")


class EmptyScheduleClient(FakeClient):
    def get_category_matchdays(self, category, phase, *, group_id, payload_sink):
        payload = {"resultado": "correcto", "ListaJornadas": []}
        payload_sink(payload)
        return []

    def get_category_matches(self, category, phase, *, group_id, payload_sink):
        payload = {"resultado": "correcto", "partidos": []}
        payload_sink(payload)
        return []


class FakeRepository:
    def __init__(self, *, existing_game=False):
        self.connection = self
        self.existing_game = existing_game
        self.values = []
        self.raw = []
        self.stale_seen = None

    def transaction(self):
        return nullcontext()

    def resolve_competition_selection(self, category_id):
        return uuid4(), "opaque-category"

    def list_competition_groups(self, competition_id):
        return [(uuid4(), "group-a", "phase-a")]

    def save_raw_payload(self, **values):
        self.raw.append(values)

    def upsert_from_external(self, **values):
        self.values.append(values)
        return uuid4()

    def resolve_registered_team(self, competition_id, name):
        return uuid4()

    def resolve_external_id(self, **values):
        return uuid4() if self.existing_game else None

    def mark_missing_games_stale(self, competition_id, seen):
        self.stale_seen = seen
        return 2


def test_schedule_sync_maps_game_skips_bye_and_marks_stale_after_success():
    repository = FakeRepository()
    summary = sync_competition_games(
        FakeClient(), repository, category_competition_id="10468"
    )

    assert summary.games == 1
    assert summary.created == 1
    assert summary.updated == 0
    assert summary.skipped_byes == 1
    assert summary.stale == 2
    assert len(repository.raw) == 2
    game = next(value for value in repository.values if value["entity_type"] == "game")
    assert game["external_id"] == "game-1"
    assert game["values"]["status"] == "scheduled"
    assert game["values"]["has_statistics"] is True
    assert game["values"]["scheduled_at"].isoformat() == "2026-09-09T19:20:00+00:00"
    assert repository.stale_seen is not None
    assert len(repository.stale_seen) == 1


def test_existing_game_is_reported_as_updated():
    repository = FakeRepository(existing_game=True)
    summary = sync_competition_games(
        FakeClient(), repository, category_competition_id="10468"
    )
    assert summary.created == 0
    assert summary.updated == 1


def test_fab_sentinel_date_is_unscheduled_and_unknown_format_fails():
    assert _parse_fab_datetime("/Date(-2208992400000)/") is None
    with pytest.raises(ScheduleContractError, match="unknown format"):
        _parse_fab_datetime("09/09/2026")


def test_partial_failure_never_marks_existing_games_stale():
    repository = FakeRepository()
    with pytest.raises(ScheduleContractError, match="partial"):
        sync_competition_games(
            FailingClient(), repository, category_competition_id="10468"
        )
    assert repository.stale_seen is None


def test_empty_non_authoritative_schedule_preserves_known_games():
    repository = FakeRepository(existing_game=True)
    summary = sync_competition_games(
        EmptyScheduleClient(), repository, category_competition_id="10468"
    )
    assert summary.games == 0
    assert summary.stale == 0
    assert repository.stale_seen is None


def test_category_without_published_groups_is_pending_not_a_contract_error():
    repository = FakeRepository(existing_game=True)
    repository.list_competition_groups = lambda _: []

    summary = sync_competition_games(
        FakeClient(), repository, category_competition_id="9955"
    )

    assert summary.groups == 0
    assert summary.games == 0
    assert repository.stale_seen is None


def test_unknown_matchday_has_safe_specific_error_code():
    class UnknownMatchdayClient(FakeClient):
        def get_category_matchdays(self, category, phase, *, group_id, payload_sink):
            payload = {"resultado": "correcto", "ListaJornadas": []}
            payload_sink(payload)
            return []

    with pytest.raises(ScheduleContractError) as failure:
        sync_competition_games(
            UnknownMatchdayClient(), FakeRepository(), category_competition_id="9955"
        )
    assert failure.value.code == "SCHEDULE_UNKNOWN_MATCHDAY"
