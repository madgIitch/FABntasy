from contextlib import nullcontext

import pytest

from fab_ingestor.discovery import CompetitionDiscoveryError, sync_competition_catalog


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
        assert query == ""
        if payload_sink: payload_sink({"categorias": self.items})
        return self.items


def test_catalog_discovers_then_detects_metadata_changes():
    repository = Repository()
    first = sync_competition_catalog(Client([candidate("10468", "N1")]), repository)
    second = sync_competition_catalog(Client([candidate("10468", "N1 Masculina")]), repository)
    assert (first.discovered, first.changed) == (1, 0)
    assert (second.discovered, second.changed) == (0, 1)


def test_empty_catalog_is_failed_and_non_authoritative():
    repository = Repository()
    with pytest.raises(CompetitionDiscoveryError, match="empty"):
        sync_competition_catalog(Client([]), repository)
    assert repository.finished[-1]["status"] == "PARTIAL"
