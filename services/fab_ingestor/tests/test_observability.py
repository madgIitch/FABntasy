from datetime import UTC, datetime

from fab_ingestor.observability import MemorySink, Observability, category, redact


def test_signal_is_versioned_redacted_and_deduplicated():
    sink = MemorySink(); obs = Observability(sink, release="r1", environment="test", now=lambda: datetime(2026, 9, 14, tzinfo=UTC))
    canary = "CANARY-DO-NOT-LEAK"
    obs.emit(component="INGESTOR", operation="sync", result="ERROR", error_category="FAB_TRANSPORT", dimensions={"jobType":"GAME", "token":canary, "rawPayload":canary, "email":canary})
    obs.emit(component="INGESTOR", operation="sync", result="ERROR", error_category="FAB_TRANSPORT")
    assert sink.signals[-1]["count"] == 2
    assert canary not in repr(sink.signals)
    assert all(field in sink.signals[-1] for field in ("timestamp","release","environment","component","operation","result","errorCategory"))

def test_sink_failure_and_disabled_are_non_fatal():
    class Broken:
        def write(self, _signal): raise RuntimeError("down")
    Observability(Broken()).emit(component="INGESTOR", operation="sync", result="ERROR", error_category="INGESTOR_FAILURE")
    Observability(enabled=False).emit(component="INGESTOR", operation="sync", result="ERROR", error_category="INGESTOR_FAILURE")

def test_classification_and_allowlist():
    class FabSyntheticError(Exception): pass
    class DatabaseError(Exception): pass
    assert category(FabSyntheticError()) == "FAB_TRANSPORT"
    assert category(DatabaseError()) == "DATABASE"
    assert redact({"jobType":"GAME", "password":"x"}) == {"jobType":"GAME"}
