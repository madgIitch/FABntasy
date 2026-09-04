from __future__ import annotations

import json
from collections.abc import Mapping
from contextlib import contextmanager
from typing import Any, ClassVar
from uuid import UUID, uuid4

import psycopg
from psycopg import Connection, sql

from .raw_payload import canonical_payload


class ExternalIdentityConflict(RuntimeError):
    pass


class SportsRepository:
    """Transactional PostgreSQL writer for normalized FAB sports data."""

    def __init__(self, connection: Connection[Any]) -> None:
        self.connection = connection

    @classmethod
    @contextmanager
    def connect(cls, database_url: str):
        with psycopg.connect(database_url) as connection:
            yield cls(connection)

    def upsert_federation(self, *, name: str, country_code: str = "ES") -> UUID:
        entity_id = uuid4()
        row = self.connection.execute(
            """
            INSERT INTO federations (id, name, country_code, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (name, country_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
            """,
            (entity_id, name, country_code),
        ).fetchone()
        assert row is not None
        return row[0]

    ENTITY_TABLES: ClassVar[dict[str, str]] = {
        "federation": "federations",
        "competition": "competitions",
        "season": "seasons",
        "competition_season": "competition_seasons",
        "group": "groups",
        "round": "rounds",
        "team": "teams",
        "team_registration": "team_registrations",
        "player": "players",
        "player_registration": "player_registrations",
        "game": "games",
        "player_game_stat": "player_game_stats",
    }

    def upsert_from_external(
        self,
        *,
        source: str,
        entity_type: str,
        external_id: str,
        values: Mapping[str, Any],
    ) -> UUID:
        """Insert or update any sports entity while preserving its internal UUID."""
        try:
            table = self.ENTITY_TABLES[entity_type]
        except KeyError as error:
            raise ValueError(f"unsupported entity type: {entity_type}") from error
        if not values:
            raise ValueError("upsert values cannot be empty")
        if "id" in values or "created_at" in values or "updated_at" in values:
            raise ValueError("repository-managed columns cannot be supplied")

        with self.connection.transaction():
            entity_id = self.resolve_external_id(
                source=source,
                entity_type=entity_type,
                external_id=external_id,
            )
            columns = list(values)
            if entity_id is None:
                entity_id = uuid4()
                query = sql.SQL("INSERT INTO {} ({}) VALUES ({}, CURRENT_TIMESTAMP)").format(
                    sql.Identifier(table),
                    sql.SQL(", ").join(
                        [sql.Identifier("id"), *map(sql.Identifier, columns), sql.Identifier("updated_at")]
                    ),
                    sql.SQL(", ").join(sql.Placeholder() for _ in range(len(columns) + 1)),
                )
                self.connection.execute(query, (entity_id, *values.values()))
                self.upsert_external_id(
                    source=source,
                    entity_type=entity_type,
                    external_id=external_id,
                    entity_id=entity_id,
                )
            else:
                assignments = sql.SQL(", ").join(
                    sql.SQL("{} = {}").format(sql.Identifier(column), sql.Placeholder())
                    for column in columns
                )
                query = sql.SQL("UPDATE {} SET {}, updated_at = CURRENT_TIMESTAMP WHERE id = {}").format(
                    sql.Identifier(table), assignments, sql.Placeholder()
                )
                self.connection.execute(query, (*values.values(), entity_id))
            return entity_id

    def upsert_external_id(
        self, *, source: str, entity_type: str, external_id: str, entity_id: UUID
    ) -> UUID:
        with self.connection.transaction():
            existing = self.connection.execute(
                """
                SELECT id, entity_id FROM external_ids
                WHERE source = %s AND entity_type = %s AND external_id = %s
                FOR UPDATE
                """,
                (source, entity_type, external_id),
            ).fetchone()
            if existing is not None:
                if existing[1] != entity_id:
                    raise ExternalIdentityConflict(
                        "external identifier is already assigned to another internal entity"
                    )
                return existing[0]
            identifier_id = uuid4()
            self.connection.execute(
                """
                INSERT INTO external_ids
                    (id, source, entity_type, external_id, entity_id, updated_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (identifier_id, source, entity_type, external_id, entity_id),
            )
            return identifier_id

    def resolve_external_id(self, *, source: str, entity_type: str, external_id: str) -> UUID | None:
        row = self.connection.execute(
            """
            SELECT entity_id FROM external_ids
            WHERE source = %s AND entity_type = %s AND external_id = %s
            """,
            (source, entity_type, external_id),
        ).fetchone()
        return None if row is None else row[0]

    def save_raw_payload(
        self,
        *,
        endpoint: str,
        entity_type: str,
        external_id: str | None,
        http_status: int,
        payload: Mapping[str, Any],
    ) -> UUID:
        sanitized, checksum = canonical_payload(payload)
        payload_id = uuid4()
        row = self.connection.execute(
            """
            INSERT INTO raw_fab_payloads
                (id, endpoint, entity_type, external_id, http_status, checksum, payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (endpoint, checksum) DO UPDATE
            SET retrieved_at = CURRENT_TIMESTAMP, http_status = EXCLUDED.http_status
            RETURNING id
            """,
            (
                payload_id,
                endpoint,
                entity_type,
                external_id,
                http_status,
                checksum,
                json.dumps(sanitized, ensure_ascii=False),
            ),
        ).fetchone()
        assert row is not None
        return row[0]
