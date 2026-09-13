"""Small PID-1 supervisor for the single-replica production topology."""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from dataclasses import dataclass


@dataclass
class Child:
    command: str
    process: subprocess.Popen[bytes]
    failures: int = 0


def _spawn(command: str) -> subprocess.Popen[bytes]:
    return subprocess.Popen([sys.executable, "-m", "fab_ingestor", command])


def run_production() -> None:
    """Run exactly one scheduler and worker; propagate TERM and cap restarts."""
    children = [Child(command, _spawn(command)) for command in ("run-scheduler", "run-admin-worker")]
    stopping = False

    def stop(signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True
        for child in children:
            if child.process.poll() is None:
                child.process.send_signal(signum)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while not stopping:
        for child in children:
            code = child.process.poll()
            if code is None:
                continue
            if code == 0:
                stopping = True
                break
            child.failures += 1
            if child.failures > 5:
                print(f'{{"event":"process_restart_exhausted","component":"{child.command}"}}', flush=True)
                stopping = True
                break
            time.sleep(min(8, 2 ** (child.failures - 1)))
            child.process = _spawn(child.command)
        if not stopping:
            time.sleep(0.2)
    stop(signal.SIGTERM, None)
    deadline = time.monotonic() + float(os.getenv("INGESTOR_SHUTDOWN_GRACE_SECONDS", "10"))
    for child in children:
        remaining = max(0.0, deadline - time.monotonic())
        try:
            child.process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            child.process.kill()
    if any(child.failures > 5 for child in children):
        raise SystemExit(1)
