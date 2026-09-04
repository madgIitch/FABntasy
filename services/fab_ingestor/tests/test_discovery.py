from contextlib import nullcontext
from uuid import uuid4

import pytest

from fab_ingestor.discovery import (
    CategoryCandidate,
    CompetitionDiscoveryError,
    discover_categories,
    sync_competition_teams,
)

VALID = {
    "Id": "opaque-category",
    "IdCompeticionCategoria": 10468,
    "NombreCategoria": "LIGA NACIONAL N1 MAS",
    "NombreCompeticion": "COPA DELEGACIÓN 2026",
    "NombreDelegacion": "Delegación de Sevilla",
}


class FakeClient:
    def search_category(self, query, *, payload_sink=None):
        payload = {"categorias": [VALID], "resultado": "correcto"}
        if payload_sink:
            payload_sink(payload)
        return [VALID]


def test_discovery_maps_candidate_and_forwards_raw_payload():
    payloads = []
    result = discover_categories(FakeClient(), "Sevilla", payload_sink=payloads.append)
    assert result == [
        CategoryCandidate(
            opaque_id="opaque-category",
            category_competition_id="10468",
            category_name="LIGA NACIONAL N1 MAS",
            competition_name="COPA DELEGACIÓN 2026",
            delegation_name="Delegación de Sevilla",
        )
    ]
    assert payloads[0]["resultado"] == "correcto"


def test_incomplete_candidate_is_rejected():
    with pytest.raises(CompetitionDiscoveryError):
        CategoryCandidate.from_payload({"Id": "only-one-field"})


class SyncClient:
    def get_category_phases(self, category_id, *, payload_sink=None):
        payload = {
            "resultado": "correcto",
            "listaFasesGrupo": [
                {
                    "IdFase": "phase-1",
                    "NombreFase": "FASE DE GRUPOS",
                    "TipoFase": "LIGA",
                    "Grupos": [
                        {"IdGrupo": "group-a", "NombreGrupo": "GRUPO A"},
                        {"IdGrupo": "group-b", "NombreGrupo": "GRUPO B"},
                    ],
                }
            ],
        }
        if payload_sink:
            payload_sink(payload)
        return payload

    def get_category_teams(self, phase_id, group_id, phase_type, *, payload_sink=None):
        teams = {
            "group-a": [{"Id": "team-a", "Nombre": "Equipo A"}, {"Id": "bye", "Nombre": "DESCANSA"}],
            "group-b": [{"Id": "team-a", "Nombre": "Equipo A"}, {"Id": "team-b", "Nombre": "Equipo B"}],
        }[group_id]
        payload = {"resultado": "correcto", "equipos": teams}
        if payload_sink:
            payload_sink(payload)
        return teams


class SyncRepository:
    def __init__(self):
        self.connection = self
        self.upserts = []
        self.raw = []

    def transaction(self):
        return nullcontext()

    def resolve_competition_selection(self, category_id):
        assert category_id == "10468"
        return uuid4(), "opaque-category"

    def save_raw_payload(self, **values):
        self.raw.append(values)

    def upsert_from_external(self, **values):
        self.upserts.append(values)
        return uuid4()

    def upsert_external_id(self, **values):
        return uuid4()


def test_team_sync_is_exhaustive_idempotent_shaped_and_skips_byes():
    repository = SyncRepository()
    summary = sync_competition_teams(
        SyncClient(), repository, category_competition_id="10468"
    )

    assert summary.phases == 1
    assert summary.groups == 2
    assert summary.teams == 2
    assert summary.skipped_placeholders == 1
    assert len(repository.raw) == 3
    team_upserts = [item for item in repository.upserts if item["entity_type"] == "team"]
    assert {item["external_id"] for item in team_upserts} == {"team-a", "team-b"}
    registrations = [
        item for item in repository.upserts if item["entity_type"] == "team_registration"
    ]
    shared_team = [item for item in registrations if item["external_id"].endswith(":team-a")]
    assert all(item["values"]["group_id"] is None for item in shared_team)
    team_b = [item for item in registrations if item["external_id"].endswith(":team-b")]
    assert team_b[0]["values"]["group_id"] is not None
