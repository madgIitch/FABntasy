from __future__ import annotations
import importlib.util
from pathlib import Path
import pytest

ROOT = Path(__file__).parents[1]

def test_versioned_topology_is_singleton_and_never_scales_to_zero():
    import json
    config = json.loads((ROOT / "infrastructure/railway/service-config.json").read_text())
    assert config["replicas"] == 1
    assert config["scaleToZero"] is False
    assert config["restart"] == {"policy": "on-failure", "maxRetries": 5}
    assert config["volume"] == {"mountPath": "/var/lib/canastio", "sizeGiB": 1}

def test_secret_scanner_detects_case_variants_and_canaries(tmp_path):
    module_path = ROOT / "scripts/deployment/secret-scan.py"
    spec = importlib.util.spec_from_file_location("secret_scan", module_path)
    module = importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(module)
    clean = tmp_path / "clean.log"; clean.write_text('{"status":"HEALTHY","count":1}')
    assert module.scan([clean], ["SENTINEL-secret"]) == []
    dirty = tmp_path / "dirty.log"; dirty.write_text("AuThOrIzAtIoN: Bearer SENTINEL-secret")
    assert module.scan([dirty], ["SENTINEL-secret"]) == [str(dirty)]

def test_dockerfile_is_non_root_and_defaults_to_supervisor():
    dockerfile = (ROOT / "services/fab_ingestor/Dockerfile").read_text()
    assert "--uid 10001" in dockerfile and "USER ingestor" in dockerfile
    assert 'CMD ["run-production"]' in dockerfile
    assert "org.opencontainers.image.revision" in dockerfile

def test_workflow_promotes_digest_after_separate_migration():
    workflow = (ROOT / ".github/workflows/ingestor-production.yml").read_text()
    assert "prisma migrate deploy" in workflow
    assert "needs.build-test-publish.outputs.digest" in workflow
    assert workflow.index("prisma migrate deploy") < workflow.index("railway redeploy")
