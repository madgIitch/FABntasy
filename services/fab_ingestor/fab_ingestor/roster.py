from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass

from .client import FabClient, FabContractError
from .repository import (
    ExternalIdentityConflict,
    FantasyCompetitionDisabled,
    SportsRepository,
    normalized_player_name,
)
from .selection import resolve_current_category_id


@dataclass(frozen=True)
class RosterSyncSummary:
    teams: int = 0
    teams_with_players: int = 0
    observed: int = 0
    created: int = 0
    tentative: int = 0
    ambiguous: int = 0
    unavailable: int = 0


def sync_competition_rosters(
    client: FabClient,
    repository: SportsRepository,
    *,
    category_competition_id: str,
    progress: Callable[[], None] | None = None,
) -> RosterSyncSummary:
    """Read each team with the current FAB device; preserve prior rows on empty/partial reads."""
    competition_season_id, _ = repository.resolve_competition_selection(
        category_competition_id
    )
    category_handle = resolve_current_category_id(client, repository, category_competition_id)
    phases = client.get_category_phases(category_handle)["listaFasesGrupo"]
    teams: dict[str, dict] = {}
    for phase in phases:
        for group in phase.get("Grupos", []):
            for team in client.get_category_teams(
                str(phase["IdFase"]), str(group["IdGrupo"]), str(phase["TipoFase"])
            ):
                if normalized_player_name(str(team.get("Nombre", ""))) == "descansa":
                    continue
                stable_id = str(team.get("IdEquipoNotificacion", "")).strip()
                if not stable_id or not team.get("Id"):
                    raise FabContractError("FAB roster team has no stable identifier")
                previous = teams.get(stable_id)
                if previous and normalized_player_name(str(previous.get("Nombre", ""))) != normalized_player_name(str(team.get("Nombre", ""))):
                    raise FabContractError("FAB stable team identifier has conflicting names")
                teams[stable_id] = team

    observed = created = tentative = ambiguous = unavailable = teams_with_players = 0
    def summary() -> RosterSyncSummary:
        return RosterSyncSummary(
            teams=len(teams), teams_with_players=teams_with_players,
            observed=observed, created=created, tentative=tentative,
            ambiguous=ambiguous, unavailable=unavailable,
        )

    for stable_id, team in teams.items():
        if not repository.is_roster_enabled(competition_season_id):
            break
        rows = client.get_team_players(str(team["Id"]))
        if not repository.is_roster_enabled(competition_season_id):
            break
        repository.save_raw_payload(
            endpoint="/v2/equipo.ashx?action=jugadores",
            entity_type="team_roster",
            external_id=f"{category_competition_id}:{stable_id}",
            http_status=200,
            payload={
                "resultado": "correcto",
                "id_equipo_notificacion": stable_id,
                "misjugadores": [
                    {key: row.get(key) for key in ("Nombre", "NombreEquipo", "Categoria", "Temporada")}
                    for row in rows
                ],
            },
        )
        if progress:
            progress()
        if not rows:
            unavailable += 1
            continue
        teams_with_players += 1
        names = Counter(normalized_player_name(str(row.get("Nombre", ""))) for row in rows)
        team_registration_id = repository.resolve_roster_team_registration(
            competition_season_id, str(team["Nombre"]), stable_id
        )
        for row in rows:
            observed += 1
            name = str(row.get("Nombre", "")).strip()
            normalized = normalized_player_name(name)
            if not normalized or names[normalized] != 1:
                if normalized and names[normalized] != 1:
                    try:
                        repository.mark_roster_name_conflict(team_registration_id, name)
                    except FantasyCompetitionDisabled:
                        return summary()
                ambiguous += 1
                continue
            if (
                normalized_player_name(str(row.get("NombreEquipo", "")))
                != normalized_player_name(str(team["Nombre"]))
                or str(row.get("Categoria", "")).strip().casefold()
                != str(team.get("Categoria", "")).strip().casefold()
                or str(row.get("Temporada", "")).strip().casefold()
                != str(team.get("Temporada", "")).strip().casefold()
            ):
                ambiguous += 1
                continue
            try:
                _, was_created, status = repository.upsert_roster_player(
                    competition_season_id=competition_season_id,
                    team_registration_id=team_registration_id,
                    display_name=name,
                )
            except FantasyCompetitionDisabled:
                return summary()
            except ExternalIdentityConflict:
                ambiguous += 1
                continue
            created += int(was_created)
            tentative += int(status == "TENTATIVE")
    return summary()
