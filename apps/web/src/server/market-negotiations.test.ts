import { describe, expect, it, vi } from "vitest";
import { instantSaleQuote } from "./market-negotiations";
import { activeOfferReservations } from "./market-reservations";

describe("manager offer economy", () => {
  it("quotes instant system sales at 80 percent with half-up rounding", () => {
    expect(instantSaleQuote(5_000_000n)).toBe(4_000_000n);
    expect(instantSaleQuote(101n)).toBe(81n);
    expect(instantSaleQuote(100n)).toBe(80n);
  });

  it("reserves only live buyer-origin proposals and can exclude the proposal being replaced", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { amountCredits: 5_000_000n, thread: { playerRegistration: { teamRegistrationId: "real-a" } } },
      { amountCredits: 2_000_000n, thread: { playerRegistration: { teamRegistrationId: "real-b" } } },
    ]);
    const tx = { marketOfferProposal: { findMany } } as unknown as Parameters<typeof activeOfferReservations>[0];
    const now = new Date("2026-09-25T10:00:00Z");
    expect(await activeOfferReservations(tx, "buyer-team", now, "replaced-proposal")).toEqual({ amount: 7_000_000n, count: 2, teamIds: ["real-a", "real-b"] });
    expect(findMany).toHaveBeenCalledWith({
      where: { proposerTeamId: "buyer-team", status: "ACTIVE", expiresAt: { gt: now }, id: { not: "replaced-proposal" }, thread: { buyerTeamId: "buyer-team", status: "OPEN", playerRegistrationId: undefined } },
      select: { amountCredits: true, thread: { select: { playerRegistration: { select: { teamRegistrationId: true } } } } },
    });
  });
});
