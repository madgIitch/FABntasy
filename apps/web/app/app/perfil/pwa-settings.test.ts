import { describe, expect, it, vi } from "vitest";
import { saveNotificationPreference } from "./pwa-settings";

describe("notification preference controls", () => {
  it.each([true, false])("persists enabled=%s without registering the device again", async (enabled) => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    await saveNotificationPreference("TEAM_LINEUP", enabled, fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "TEAM_LINEUP", enabled }),
    });
  });
});
