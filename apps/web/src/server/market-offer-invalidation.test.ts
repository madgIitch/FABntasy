import { describe, expect, it, vi } from "vitest";
import { cancelCompetitionNegotiations, invalidatePlayerNegotiations } from "./market-offer-invalidation";

function transaction() {
  const tx = {
    fantasyLeague: { findMany: vi.fn().mockResolvedValue([{ id: "league" }]), findUnique: vi.fn().mockResolvedValue({ competitionSeasonId: "season", selectedSeasons: [{ competitionSeasonId: "season" }] }) },
    competitionSeason: { findFirst: vi.fn().mockResolvedValue(null) },
    marketOfferThread: { findMany: vi.fn().mockResolvedValue([{ id: "thread" }]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    marketOfferProposal: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    marketTransferListing: { findMany: vi.fn().mockResolvedValue([{ id: "listing" }]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    marketSystemOffer: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  return tx;
}

describe("negotiation invalidation", () => {
  it("invalidates active proposals, listings and system offers when ownership changes", async () => {
    const tx = transaction();
    await invalidatePlayerNegotiations(tx as never, "league", "player");
    expect(tx.marketOfferProposal.updateMany).toHaveBeenCalledWith({ where: { threadId: { in: ["thread"] }, status: "ACTIVE" }, data: { status: "INVALID" } });
    expect(tx.marketOfferThread.updateMany).toHaveBeenCalledWith({ where: { leagueId: "league", playerRegistrationId: "player", status: "OPEN" }, data: { status: "INVALID" } });
    expect(tx.marketSystemOffer.updateMany).toHaveBeenCalledWith({ where: { listingId: { in: ["listing"] }, status: "ACTIVE" }, data: { status: "INVALID" } });
    expect(tx.marketTransferListing.updateMany).toHaveBeenCalledWith({ where: { leagueId: "league", playerRegistrationId: "player", status: "OPEN" }, data: { status: "INVALID" } });
  });

  it("closes all active negotiations when Fantasy is suspended", async () => {
    const tx = transaction();
    await cancelCompetitionNegotiations(tx as never, "season");
    expect(tx.fantasyLeague.findMany).toHaveBeenCalledWith({ where: { OR: [{ competitionSeasonId: "season" }, { selectedSeasons: { some: { competitionSeasonId: "season" } } }] }, select: { id: true } });
    expect(tx.marketOfferThread.updateMany).toHaveBeenCalledWith({ where: { leagueId: "league", status: "OPEN" }, data: { status: "INVALID" } });
    expect(tx.marketTransferListing.updateMany).toHaveBeenCalledWith({ where: { leagueId: "league", status: "OPEN" }, data: { status: "INVALID" } });
  });

  it("invalidates only players from a disabled secondary edition", async () => {
    const tx = transaction();
    tx.fantasyLeague.findUnique.mockResolvedValue({ competitionSeasonId: "primary", selectedSeasons: [{ competitionSeasonId: "primary" }, { competitionSeasonId: "secondary" }] });
    tx.competitionSeason.findFirst.mockResolvedValue({ id: "primary" });
    tx.marketOfferThread.findMany.mockResolvedValueOnce([{ playerRegistrationId: "secondary-player" }]).mockResolvedValueOnce([{ id: "thread" }]);
    tx.marketTransferListing.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "listing" }]);
    await cancelCompetitionNegotiations(tx as never, "secondary");
    expect(tx.marketOfferThread.updateMany).toHaveBeenCalledWith({ where: { leagueId: "league", playerRegistrationId: "secondary-player", status: "OPEN" }, data: { status: "INVALID" } });
    expect(tx.marketOfferThread.updateMany).not.toHaveBeenCalledWith({ where: { leagueId: "league", status: "OPEN" }, data: { status: "INVALID" } });
  });
});
