from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from psycopg.types.json import Jsonb

from .client import FabClient
from .repository import SportsRepository


class ScheduleContractError(RuntimeError):
    pass


@dataclass(frozen=True)
class ScheduleSyncSummary:
    groups: int
    matchdays: int
    games: int
    created: int
    updated: int
    stale: int
    skipped_byes: int


def sync_competition_games(
    client: FabClient,
    repository: SportsRepository,
    *,
    category_competition_id: str,
    round_number: int | None = None,
) -> ScheduleSyncSummary:
    competition_season_id, opaque_category_id = repository.resolve_competition_selection(
        category_competition_id
    )
    groups = repository.list_competition_groups(competition_season_id)
    if not groups:
        raise ScheduleContractError("selected FAB competition has no synchronized groups")

    raw_payloads: list[tuple[str, str, dict[str, Any]]] = []
    collected: dict[str, tuple[Any, str, dict[str, Any]]] = {}
    matchdays_seen: set[tuple[str, int]] = set()
    skipped_byes = 0

    for internal_group_id, external_group_id, phase_id in groups:
        matchday_payloads: list[dict] = []
        matchdays = client.get_category_matchdays(
            opaque_category_id,
            phase_id,
            group_id=external_group_id,
            payload_sink=matchday_payloads.append,
        )
        raw_payloads.extend(
            ("category_matchdays", external_group_id, payload) for payload in matchday_payloads
        )
        for matchday in matchdays:
            number = _required_int(matchday, "NumeroJornada", "matchday")
            if round_number is not None and number != round_number:
                continue
            _required_text(matchday, "IdJornada", "matchday")
            matchdays_seen.add((external_group_id, number))

        match_payloads: list[dict] = []
        matches = client.get_category_matches(
            opaque_category_id,
            phase_id,
            group_id=external_group_id,
            payload_sink=match_payloads.append,
        )
        raw_payloads.extend(
            ("category_matches", external_group_id, payload) for payload in match_payloads
        )
        for match in matches:
            home = _required_text(match, "NombreEquipoLocal", "match")
            away = _required_text(match, "NombreEquipoVisitante", "match")
            if "descansa" in {home.casefold(), away.casefold()}:
                skipped_byes += 1
                continue
            number = _required_int(match, "NumeroJornada", "match")
            if round_number is not None and number != round_number:
                continue
            if (external_group_id, number) not in matchdays_seen:
                raise ScheduleContractError("FAB match references an unknown matchday")
            external_game_id = _required_text(match, "IdPartido", "match")
            candidate = (internal_group_id, external_group_id, match)
            previous = collected.get(external_game_id)
            if previous is not None and previous != candidate:
                raise ScheduleContractError("FAB returned a contradictory duplicate match")
            collected[external_game_id] = candidate

    created = 0
    updated = 0
    seen_internal_ids: set[Any] = set()
    with repository.connection.transaction():
        for entity_type, external_id, payload in raw_payloads:
            repository.save_raw_payload(
                endpoint=f"/v2/categoria.ashx?action={_action_for(entity_type)}",
                entity_type=entity_type,
                external_id=external_id,
                http_status=200,
                payload=payload,
            )

        for external_game_id, (group_id, external_group_id, match) in collected.items():
            number = _required_int(match, "NumeroJornada", "match")
            round_id = repository.upsert_from_external(
                source="FAB",
                entity_type="round",
                external_id=f"{external_group_id}:{number}",
                values={"group_id": group_id, "number": number, "name": f"Jornada {number}"},
            )
            home_name = _required_text(match, "NombreEquipoLocal", "match")
            away_name = _required_text(match, "NombreEquipoVisitante", "match")
            home_team_id = repository.resolve_registered_team(competition_season_id, home_name)
            away_team_id = repository.resolve_registered_team(competition_season_id, away_name)
            existed = repository.resolve_external_id(
                source="FAB", entity_type="game", external_id=external_game_id
            )
            results = match.get("Resultados")
            home_score, away_score, periods = _parse_results(results)
            source_status = _required_text(match, "Estado", "match")
            game_id = repository.upsert_from_external(
                source="FAB",
                entity_type="game",
                external_id=external_game_id,
                values={
                    "competition_season_id": competition_season_id,
                    "group_id": group_id,
                    "round_id": round_id,
                    "home_team_id": home_team_id,
                    "away_team_id": away_team_id,
                    "scheduled_at": _parse_fab_datetime(match.get("FechaHoraUTC")),
                    "source_timezone": "Europe/Madrid",
                    "round_number": number,
                    "status": _normalize_status(source_status),
                    "source_status": source_status,
                    "home_score": home_score,
                    "away_score": away_score,
                    "score_by_period": Jsonb(periods) if periods is not None else None,
                    "source_score": Jsonb(results) if isinstance(results, dict) else None,
                    "record_type": _optional_text(match.get("TipoActa")),
                    "has_statistics": _has_statistics(match.get("TipoActa")),
                    "source_updated_at": datetime.now(UTC),
                    "last_seen_at": datetime.now(UTC),
                    "sync_status": "active",
                },
            )
            seen_internal_ids.add(game_id)
            if existed is None:
                created += 1
            else:
                updated += 1

        # An empty FAB schedule is not an authoritative empty snapshot. The endpoint
        # occasionally returns resultado=correcto with no matchdays while search still
        # exposes active games. Preserve known games and retry on the next run.
        stale = (
            repository.mark_missing_games_stale(competition_season_id, seen_internal_ids)
            if matchdays_seen and round_number is None
            else 0
        )

    return ScheduleSyncSummary(
        groups=len(groups),
        matchdays=len(matchdays_seen),
        games=len(seen_internal_ids),
        created=created,
        updated=updated,
        stale=stale,
        skipped_byes=skipped_byes,
    )


def _parse_fab_datetime(value: Any) -> datetime | None:
    if value is None or not str(value).strip():
        return None
    match = re.fullmatch(r"/Date\((-?\d+)(?:[+-]\d{4})?\)/", str(value).strip())
    if match is None:
        raise ScheduleContractError("FAB match datetime has an unknown format")
    milliseconds = int(match.group(1))
    if milliseconds <= 0:
        return None
    return datetime.fromtimestamp(milliseconds / 1000, UTC)


def _parse_results(value: Any) -> tuple[int | None, int | None, list | None]:
    if value is None:
        return None, None, None
    if not isinstance(value, dict):
        raise ScheduleContractError("FAB match results are invalid")
    periods = value.get("ResultadosPeriodo")
    if periods is not None and not isinstance(periods, list):
        raise ScheduleContractError("FAB period results are invalid")
    return _optional_score(value.get("ResultadoLocal")), _optional_score(
        value.get("ResultadoVisitante")
    ), periods


def _optional_score(value: Any) -> int | None:
    if value in (None, "", "-"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise ScheduleContractError("FAB score is not an integer") from error


def _normalize_status(value: str) -> str:
    normalized = _fold(value)
    if normalized in {"finalizado", "terminado"}:
        return "finished"
    if normalized in {"en juego", "en directo"}:
        return "live"
    if normalized in {"aplazado", "suspendido"}:
        return "postponed"
    if normalized in {"no comenzado", "programado"}:
        return "scheduled"
    return "unknown"


def _has_statistics(value: Any) -> bool:
    return _fold(_optional_text(value) or "").startswith("estad")


def _fold(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(character)
    )


def _required_text(payload: dict[str, Any], key: str, entity: str) -> str:
    value = _optional_text(payload.get(key))
    if value is None:
        raise ScheduleContractError(f"FAB {entity} is missing {key}")
    return value


def _optional_text(value: Any) -> str | None:
    if value is None or not str(value).strip():
        return None
    return str(value).strip()


def _required_int(payload: dict[str, Any], key: str, entity: str) -> int:
    try:
        return int(payload[key])
    except (KeyError, TypeError, ValueError) as error:
        raise ScheduleContractError(f"FAB {entity} has invalid {key}") from error


def _action_for(entity_type: str) -> str:
    return "Jornadas" if entity_type == "category_matchdays" else "horariosJornadas"
