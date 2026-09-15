import { describe, expect, it, vi } from "vitest";
import { enqueuePushEvent, validateOutboxEvent, wakePushWorker } from "./push-outbox";

const event = { userProfileId: "00000000-0000-0000-0000-000000000001", intent: "ROUND_RESULT" as const,
  eventKey: "round:4:revision:1", title: "Jornada lista", body: "Consulta tu resultado", destination: "/app/jornada" };

describe("push outbox", () => {
  it("keeps only the minimal validated dispatch payload", () => {
    expect(validateOutboxEvent(event)).toEqual({ userProfileId: event.userProfileId, intent: event.intent,
      title: event.title, body: event.body, destination: event.destination });
  });

  it("uses an idempotent insert in the caller transaction", async () => {
    const execute = vi.fn().mockResolvedValue(0);
    await enqueuePushEvent({ $executeRaw: execute }, event);
    expect(execute).toHaveBeenCalledOnce();
    expect(String(execute.mock.calls[0][0].strings)).toContain("ON CONFLICT (event_key) DO NOTHING");
  });

  it("treats wake-up as best effort and sends no payload", async () => {
    vi.stubEnv("CANASTIO_PUSH_WAKE_URL", "https://worker.example/internal/push/wake");
    vi.stubEnv("CANASTIO_PUSH_WAKE_SECRET", "wake-only");
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    await expect(wakePushWorker(fetcher as unknown as typeof fetch)).resolves.toBe(true);
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty("body");
    vi.unstubAllEnvs();
  });
});
