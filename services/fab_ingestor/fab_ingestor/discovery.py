from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from .client import FabClient
from .repository import SportsRepository
from .selection import resolve_current_category_id

CATALOG_DISCOVERY_SEEDS = tuple("abcdefghijklmnñopqrstuvwxyz0123456789")


class CompetitionDiscoveryError(RuntimeError):
    pass


@dataclass(frozen=True)
class CategoryCandidate:
    opaque_id: str
    category_competition_id: str
    category_name: str
    competition_name: str
    delegation_name: str

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> CategoryCandidate:
        fields = {
            "opaque_id": payload.get("Id"),
            "category_competition_id": payload.get("IdCompeticionCategoria"),
            "category_name": payload.get("NombreCategoria"),
            "competition_name": payload.get("NombreCompeticion"),
            "delegation_name": payload.get("NombreDelegacion"),
        }
        if any(value is None or str(value).strip() == "" for value in fields.values()):
            raise CompetitionDiscoveryError("FAB category candidate is incomplete")
        return cls(**{key: str(value) for key, value in fields.items()})


@dataclass(frozen=True)
class CompetitionSyncSummary:
    phases: int
    groups: int
    teams: int
    skipped_placeholders: int


@dataclass(frozen=True)
class CatalogSyncSummary:
    pages: int
    observed: int
    discovered: int
    changed: int


def discover_categories(
    client: FabClient,
    query: str,
    *,
    payload_sink=None,
) -> list[CategoryCandidate]:
    return [
        CategoryCandidate.from_payload(item)
        for item in client.search_category(query, payload_sink=payload_sink)
    ]


def sync_competition_catalog(
    client: FabClient,
    repository: SportsRepository,
) -> CatalogSyncSummary:
    raw_pages: list[dict] = []
    scan_id = repository.start_catalog_scan()
    try:
        candidates = discover_categories(client, "", payload_sink=raw_pages.append)
        if not candidates:
            by_id: dict[str, CategoryCandidate] = {}
            for seed in CATALOG_DISCOVERY_SEEDS:
                for candidate in discover_categories(client, seed, payload_sink=raw_pages.append):
                    by_id[candidate.opaque_id] = candidate
            candidates = list(by_id.values())
        if not candidates:
            raise CompetitionDiscoveryError("FAB competition catalog was empty")
        by_category: dict[str, CategoryCandidate] = {}
        for candidate in sorted(candidates, key=lambda item: item.opaque_id):
            by_category.setdefault(candidate.category_competition_id, candidate)
        candidates = list(by_category.values())
        discovered = changed = 0
        with repository.connection.transaction():
            for candidate in candidates:
                metadata = {
                    "categoryCompetitionId": candidate.category_competition_id,
                    "categoryName": candidate.category_name,
                    "competitionName": candidate.competition_name,
                    "delegationName": candidate.delegation_name,
                }
                checksum = hashlib.sha256(
                    json.dumps(metadata, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
                ).hexdigest()
                result = repository.upsert_catalog_candidate(candidate, checksum, metadata)
                discovered += int(result == "DISCOVERED")
                changed += int(result == "CHANGED")
            repository.finish_catalog_scan(
                scan_id,
                status="SUCCEEDED",
                pages=len(raw_pages),
                observed=len(candidates),
                discovered=discovered,
                changed=changed,
            )
        return CatalogSyncSummary(len(raw_pages), len(candidates), discovered, changed)
    except Exception:
        repository.finish_catalog_scan(
            scan_id,
            status="PARTIAL" if raw_pages else "FAILED",
            pages=len(raw_pages),
            error_code="FAB_CATALOG_SCAN_FAILED",
        )
        raise


def select_competition(
    repository: SportsRepository,
    candidate: CategoryCandidate,
    *,
    season_name: str,
    role: str,
) -> str:
    if role not in {"validation", "primary"}:
        raise ValueError("role must be validation or primary")
    with repository.connection.transaction():
        federation_id = repository.upsert_federation(name="Federación Andaluza de Baloncesto")
        competition_id = repository.upsert_from_external(
            source="FAB",
            entity_type="competition",
            external_id=candidate.category_competition_id,
            values={"federation_id": federation_id, "name": candidate.competition_name},
        )
        season_id = repository.upsert_from_external(
            source="FAB",
            entity_type="season",
            external_id=season_name,
            values={"name": season_name},
        )
        competition_season_id = repository.upsert_from_external(
            source="FAB",
            entity_type="competition_season",
            external_id=candidate.opaque_id,
            values={
                "competition_id": competition_id,
                "season_id": season_id,
                "name": candidate.competition_name,
                "category_name": candidate.category_name,
                "delegation_name": candidate.delegation_name,
                "fantasy_enabled": role == "primary",
                "fantasy_role": role,
            },
        )
        repository.upsert_external_id(
            source="FAB_CATEGORY_COMPETITION",
            entity_type="competition_season",
            external_id=candidate.category_competition_id,
            entity_id=competition_season_id,
        )
        return str(competition_season_id)


def sync_competition_teams(
    client: FabClient,
    repository: SportsRepository,
    *,
    category_competition_id: str,
) -> CompetitionSyncSummary:
    competition_season_id, _ = repository.resolve_competition_selection(
        category_competition_id
    )
    opaque_category_id = resolve_current_category_id(client, repository, category_competition_id)
    raw_phases: list[dict] = []
    phases_payload = client.get_category_phases(
        opaque_category_id,
        payload_sink=raw_phases.append,
    )
    phases = phases_payload["listaFasesGrupo"]
    group_rows: list[tuple[str, str, str, list[dict]]] = []
    raw_team_payloads: list[tuple[str, dict]] = []
    skipped = 0

    for phase in phases:
        phase_id = _required_text(phase, "IdFase", "phase")
        phase_name = _required_text(phase, "NombreFase", "phase")
        phase_type = _required_text(phase, "TipoFase", "phase")
        groups = phase.get("Grupos")
        if not isinstance(groups, list):
            raise CompetitionDiscoveryError("FAB phase groups are invalid")
        for group in groups:
            if not isinstance(group, dict):
                raise CompetitionDiscoveryError("FAB phase group is invalid")
            group_id = _required_text(group, "IdGrupo", "group")
            group_name = _required_text(group, "NombreGrupo", "group")
            payloads: list[dict] = []
            teams = client.get_category_teams(
                phase_id,
                group_id,
                phase_type,
                payload_sink=payloads.append,
            )
            raw_team_payloads.extend((group_id, payload) for payload in payloads)
            real_teams = []
            for team in teams:
                name = _required_text(team, "Nombre", "team")
                _required_text(team, "Id", "team")
                if name.casefold() == "descansa":
                    skipped += 1
                else:
                    real_teams.append(team)
            group_rows.append((group_id, f"{phase_name} · {group_name}", phase_id, real_teams))

    memberships: dict[str, set[str]] = {}
    for group_id, _, _, teams in group_rows:
        for team in teams:
            memberships.setdefault(str(team["Id"]), set()).add(group_id)

    with repository.connection.transaction():
        for payload in raw_phases:
            repository.save_raw_payload(
                endpoint="/v2/categoria.ashx?action=fasesGrupos",
                entity_type="competition_phases",
                external_id=category_competition_id,
                http_status=200,
                payload=payload,
            )
        for group_id, payload in raw_team_payloads:
            repository.save_raw_payload(
                endpoint="/v2/categoria.ashx?action=equipos",
                entity_type="competition_group_teams",
                external_id=group_id,
                http_status=200,
                payload=payload,
            )

        group_internal_ids: dict[str, Any] = {}
        for group_id, group_name, phase_id, _ in group_rows:
            if hasattr(repository, "upsert_fab_group"):
                internal_id = repository.upsert_fab_group(
                    competition_season_id=competition_season_id,
                    group_id=group_id,
                    name=group_name,
                )
            else:
                internal_id = repository.upsert_from_external(
                    source="FAB",
                    entity_type="group",
                    external_id=group_id,
                    values={"competition_season_id": competition_season_id, "name": group_name},
                )
            repository.upsert_external_id(
                source="FAB_PHASE",
                entity_type="group",
                external_id=f"{phase_id}:{group_id}",
                entity_id=internal_id,
            )
            group_internal_ids[group_id] = internal_id

        team_ids: set[str] = set()
        for group_id, _, _, teams in group_rows:
            for team in teams:
                external_team_id = str(team["Id"])
                stable_team_id = str(team.get("IdEquipoNotificacion", "")).strip()
                name = str(team["Nombre"]).strip()
                assigned_group = (
                    group_internal_ids[group_id] if len(memberships[external_team_id]) == 1 else None
                )
                if stable_team_id and hasattr(repository, "upsert_fab_team_registration"):
                    repository.upsert_fab_team_registration(
                        competition_season_id=competition_season_id,
                        category_competition_id=category_competition_id,
                        stable_team_id=stable_team_id,
                        device_team_id=external_team_id,
                        display_name=name,
                        group_id=assigned_group,
                    )
                    team_ids.add(stable_team_id)
                    continue
                team_id = repository.upsert_from_external(
                    source="FAB",
                    entity_type="team",
                    external_id=external_team_id,
                    values={"name": name},
                )
                repository.upsert_from_external(
                    source="FAB",
                    entity_type="team_registration",
                    external_id=f"{category_competition_id}:{external_team_id}",
                    values={
                        "team_id": team_id,
                        "competition_season_id": competition_season_id,
                        "group_id": assigned_group,
                        "display_name": name,
                    },
                )
                team_ids.add(external_team_id)

    return CompetitionSyncSummary(
        phases=len(phases),
        groups=len(group_rows),
        teams=len(team_ids),
        skipped_placeholders=skipped,
    )


def _required_text(payload: dict[str, Any], key: str, entity: str) -> str:
    value = payload.get(key)
    if value is None or not str(value).strip():
        raise CompetitionDiscoveryError(f"FAB {entity} is missing {key}")
    return str(value).strip()
