from contextlib import nullcontext

import pytest

from fab_ingestor.discovery import CompetitionDiscoveryError, sync_competition_catalog
from fab_ingestor.repository import SportsRepository


def candidate(identifier, name):
    return {"Id": f"opaque-{identifier}", "IdCompeticionCategoria": identifier, "NombreCategoria": name, "NombreCompeticion": name, "NombreDelegacion": "Andalucía"}


class Repository:
    connection = None
    def __init__(self): self.connection = self; self.rows = {}; self.finished = []
    def transaction(self): return nullcontext()
    def start_catalog_scan(self): return "scan"
    def finish_catalog_scan(self, scan_id, **values): self.finished.append(values)
    def upsert_catalog_candidate(self, item, checksum, metadata):
        previous = self.rows.get(item.opaque_id); self.rows[item.opaque_id] = (checksum, metadata)
        return "DISCOVERED" if previous is None else "CHANGED" if previous[0] != checksum else "UNCHANGED"


class Client:
    def __init__(self, items): self.items = items
    def search_category(self, query, payload_sink=None):
        if payload_sink: payload_sink({"categorias": self.items})
        return self.items


class SeedClient:
    def __init__(self): self.queries = []
    def search_category(self, query, payload_sink=None):
        self.queries.append(query)
        items = [candidate("10468", "Liga Nacional")] if query == "a" else []
        if payload_sink: payload_sink({"categorias": items})
        return items


def test_catalog_discovers_then_detects_metadata_changes():
    repository = Repository()
    first = sync_competition_catalog(Client([candidate("10468", "N1")]), repository)
    second = sync_competition_catalog(Client([candidate("10468", "N1 Masculina")]), repository)
    assert (first.discovered, first.changed) == (1, 0)
    assert (second.discovered, second.changed) == (0, 1)


def test_catalog_falls_back_to_exhaustive_character_index_and_deduplicates():
    repository = Repository(); client = SeedClient()
    result = sync_competition_catalog(client, repository)
    assert client.queries[0] == ""
    assert "a" in client.queries and "ñ" in client.queries and "9" in client.queries
    assert (result.observed, result.discovered) == (1, 1)


def test_catalog_deduplicates_changing_opaque_ids_by_stable_category_id():
    repository = Repository()
    first = candidate("10468", "N1")
    second = {**first, "Id": "another-opaque-id"}

    result = sync_competition_catalog(Client([first, second]), repository)

    assert (result.observed, result.discovered, result.changed) == (1, 1, 0)
    assert len(repository.rows) == 1


def test_empty_catalog_is_failed_and_non_authoritative():
    repository = Repository()
    with pytest.raises(CompetitionDiscoveryError, match="empty"):
        sync_competition_catalog(Client([]), repository)
    assert repository.finished[-1]["status"] == "PARTIAL"


def test_catalog_repository_links_by_stable_category_id():
    class Connection:
        def __init__(self):
            self.calls = []

        def execute(self, sql, params=()):
            self.calls.append((" ".join(sql.split()), params))
            if "FROM fab_competition_catalog" in sql:
                return type("Result", (), {"fetchone": lambda self: None})()
            if "FROM external_ids" in sql:
                return type("Result", (), {"fetchone": lambda self: ("season-id",)})()
            return type("Result", (), {"fetchone": lambda self: ("catalog-id",)})()

    connection = Connection()
    item = type("Candidate", (), {
        "opaque_id": "changing-opaque-id",
        "category_competition_id": "10468",
        "category_name": "N1",
        "competition_name": "Copa",
        "delegation_name": "Sevilla",
    })()

    SportsRepository(connection).upsert_catalog_candidate(item, "a" * 64, {})

    link_call = next(call for call in connection.calls if "FROM external_ids" in call[0])
    assert "FAB_CATEGORY_COMPETITION" in link_call[0]
    assert link_call[1] == ("10468",)
