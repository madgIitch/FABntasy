import { describe, expect, it } from "vitest";
import { roundWindow } from "./league-round-window";

const date = (day: number) => new Date(`2026-10-${String(day).padStart(2, "0")}T18:00:00.000Z`);

describe("league round windows", () => {
  it("uses the earliest game of each primary round and an exclusive next boundary", () => {
    expect(roundWindow([
      { roundNumber: 2, scheduledAt: date(11) },
      { roundNumber: 1, scheduledAt: date(5) },
      { roundNumber: 1, scheduledAt: date(4) },
      { roundNumber: 3, scheduledAt: date(18) },
    ], 1)).toEqual({ startsAt: date(4), endsAt: date(11) });
  });

  it("waits for a published calendar and rejects overlapping anchor rounds", () => {
    expect(roundWindow([{ roundNumber: 2, scheduledAt: date(11) }], 1)).toBeNull();
    expect(roundWindow([{ roundNumber: 1, scheduledAt: date(11) }, { roundNumber: 2, scheduledAt: date(4) }], 1)).toBeNull();
  });
});
