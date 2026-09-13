"""Fail closed when release artifacts contain secret names or supplied canaries."""
from __future__ import annotations
import argparse
import re
from pathlib import Path

PATTERNS = [
    r"(?i)(fab[_-]?(device|key)|database_url|internal[_-]?job[_-]?secret)\s*[:=]\s*[^\s$<{]+",
    r"(?i)(authorization|cookie)\s*[:=]\s*(bearer\s+)?[^\s$<{]+",
    r"(?i)raw[_-]?(payload|fab)",
    r"postgres(?:ql)?://[^\s]+:[^\s]+@",
]

def scan(paths: list[Path], canaries: list[str]) -> list[str]:
    findings: list[str] = []
    compiled = [re.compile(item) for item in PATTERNS]
    for path in paths:
        candidates = path.rglob("*") if path.is_dir() else [path]
        for candidate in candidates:
            if not candidate.is_file() or ".git" in candidate.parts:
                continue
            try: text = candidate.read_text(encoding="utf-8", errors="ignore")
            except OSError: continue
            if any(pattern.search(text) for pattern in compiled) or any(value and value.casefold() in text.casefold() for value in canaries):
                findings.append(str(candidate))
    return findings

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--canary", action="append", default=[])
    args = parser.parse_args()
    found = scan([Path(item) for item in args.paths], args.canary)
    if found:
        raise SystemExit("secret scan failed: " + ", ".join(sorted(set(found))))
    print("secret scan passed")
