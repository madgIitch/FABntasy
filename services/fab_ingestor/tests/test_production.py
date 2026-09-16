from fab_ingestor import production


def test_production_starts_exactly_one_scheduler(monkeypatch):
    commands = []

    class Process:
        def __init__(self, command):
            self.command = command
            self.polls = 0

        def poll(self):
            self.polls += 1
            return 0 if self.command == "run-admin-worker" else None

        def send_signal(self, _signum):
            return None

        def wait(self, timeout):
            return 0

        def kill(self):
            return None

    def popen(argv):
        command = argv[-1]
        commands.append(command)
        return Process(command)

    monkeypatch.delenv("CANASTIO_PUSH_DISPATCH_URL", raising=False)
    monkeypatch.setattr(production.subprocess, "Popen", popen)
    monkeypatch.setattr(production.time, "sleep", lambda _: None)

    production.run_production()

    assert commands == ["run-scheduler", "run-admin-worker"]
    assert commands.count("run-scheduler") == 1


def test_failed_scheduler_child_is_restarted_once(monkeypatch):
    commands = []
    scheduler_attempts = 0

    class Process:
        def __init__(self, command, exit_code):
            self.command = command
            self.exit_code = exit_code

        def poll(self):
            return self.exit_code

        def send_signal(self, _signum):
            return None

        def wait(self, timeout):
            return 0

        def kill(self):
            return None

    def popen(argv):
        nonlocal scheduler_attempts
        command = argv[-1]
        commands.append(command)
        if command == "run-scheduler":
            scheduler_attempts += 1
            return Process(command, 1 if scheduler_attempts == 1 else None)
        return Process(command, 0)

    monkeypatch.delenv("CANASTIO_PUSH_DISPATCH_URL", raising=False)
    monkeypatch.setattr(production.subprocess, "Popen", popen)
    monkeypatch.setattr(production.time, "sleep", lambda _: None)

    production.run_production()

    assert commands.count("run-scheduler") == 2
