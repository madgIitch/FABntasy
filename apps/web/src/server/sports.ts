import { unstable_cache } from "next/cache";
import { db } from "./db";

export const PAGE_SIZE = 20;
export const pageNumber = (value: string | null) => Math.max(1, Number.parseInt(value ?? "1", 10) || 1);

export const getCompetitionOverview = unstable_cache(async () => {
  const season = await db.competitionSeason.findFirst({
    where: { fantasyEnabled: true },
    orderBy: [{ fantasyRole: "asc" }, { updatedAt: "desc" }],
    include: {
      competition: true,
      season: true,
      teamRegistrations: { include: { team: true } },
      games: {
        where: { syncStatus: "active" },
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ scheduledAt: "desc" }],
      },
    },
  });
  if (!season) return null;

  const standings = season.teamRegistrations.map(({ team }) => {
    const finished = season.games.filter((game) => game.status === "finished" && (game.homeTeamId === team.id || game.awayTeamId === team.id));
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const game of finished) {
      const home = game.homeTeamId === team.id;
      const own = home ? game.homeScore : game.awayScore;
      const rival = home ? game.awayScore : game.homeScore;
      if (own == null || rival == null) continue;
      pointsFor += own;
      pointsAgainst += rival;
      if (own > rival) wins += 1;
      else losses += 1;
    }
    return { id: team.id, name: team.name, played: wins + losses, wins, losses, pointsFor, pointsAgainst };
  }).sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));

  return {
    id: season.id,
    name: season.name ?? season.competition.name,
    competition: season.competition.name,
    season: season.season.name,
    delegation: season.delegationName,
    updatedAt: season.updatedAt.toISOString(),
    standings,
  };
}, ["sports-competition-overview"], { revalidate: 60 });

export async function listGames(page = 1, round?: number) {
  const competition = await db.competitionSeason.findFirst({ where: { fantasyEnabled: true }, orderBy: { updatedAt: "desc" } });
  if (!competition) return { items: [], page, pages: 0, total: 0, updatedAt: null };
  const where = { competitionSeasonId: competition.id, syncStatus: "active", ...(round ? { roundNumber: round } : {}) };
  const [total, games] = await db.$transaction([
    db.game.count({ where }),
    db.game.findMany({ where, include: { homeTeam: true, awayTeam: true }, orderBy: [{ scheduledAt: "desc" }, { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { items: games.map((game) => ({ ...game, scheduledAt: game.scheduledAt?.toISOString() ?? null, sourceUpdatedAt: game.sourceUpdatedAt?.toISOString() ?? null, lastSeenAt: game.lastSeenAt.toISOString(), createdAt: game.createdAt.toISOString(), updatedAt: game.updatedAt.toISOString() })), page, pages: Math.ceil(total / PAGE_SIZE), total, updatedAt: competition.updatedAt.toISOString() };
}

export const getGame = unstable_cache(async (id: string) => db.game.findUnique({
  where: { id },
  include: {
    competitionSeason: { include: { competition: true, season: true } },
    homeTeam: true,
    awayTeam: true,
    playerStats: { include: { playerRegistration: { include: { player: true, teamRegistration: { include: { team: true } } } } }, orderBy: [{ points: "desc" }] },
  },
}), ["sports-game"], { revalidate: 60 });

export async function listPlayers(page = 1, query = "") {
  const competition = await db.competitionSeason.findFirst({ where: { fantasyEnabled: true }, orderBy: { updatedAt: "desc" } });
  if (!competition) return { items: [], page, pages: 0, total: 0, updatedAt: null };
  const where = { competitionSeasonId: competition.id, ...(query ? { player: { displayName: { contains: query, mode: "insensitive" as const } } } : {}) };
  const [total, registrations] = await db.$transaction([
    db.playerRegistration.count({ where }),
    db.playerRegistration.findMany({ where, include: { player: true, teamRegistration: { include: { team: true } }, stats: true }, orderBy: { player: { displayName: "asc" } }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const items = registrations.map((registration) => ({
    id: registration.player.id,
    name: registration.player.displayName,
    team: registration.teamRegistration.team.name,
    games: registration.stats.length,
    points: registration.stats.reduce((sum, stat) => sum + (stat.points ?? 0), 0),
    valuation: registration.stats.reduce((sum, stat) => sum + (stat.valuation ?? 0), 0),
  }));
  return { items, page, pages: Math.ceil(total / PAGE_SIZE), total, updatedAt: competition.updatedAt.toISOString() };
}

export const getPlayer = unstable_cache(async (id: string) => {
  const player = await db.player.findUnique({ where: { id }, include: { registrations: { include: { teamRegistration: { include: { team: true } }, competitionSeason: { include: { competition: true, season: true } }, stats: { include: { game: { include: { homeTeam: true, awayTeam: true } } }, orderBy: { game: { scheduledAt: "desc" } } } } } } });
  if (!player) return null;
  const stats = player.registrations.flatMap((registration) => registration.stats);
  const sum = (key: "points" | "rebounds" | "assists" | "steals" | "valuation") => stats.reduce((total, stat) => total + (stat[key] ?? 0), 0);
  return { player, games: stats.length, totals: { points: sum("points"), rebounds: sum("rebounds"), assists: sum("assists"), steals: sum("steals"), valuation: sum("valuation") } };
}, ["sports-player"], { revalidate: 60 });

export const getTeam = unstable_cache(async (id: string) => db.team.findUnique({
  where: { id },
  include: {
    registrations: { include: { competitionSeason: { include: { season: true } }, playerRegistrations: { include: { player: true, stats: true }, orderBy: { player: { displayName: "asc" } } } } },
    homeGames: { include: { homeTeam: true, awayTeam: true }, orderBy: { scheduledAt: "desc" }, take: 10 },
    awayGames: { include: { homeTeam: true, awayTeam: true }, orderBy: { scheduledAt: "desc" }, take: 10 },
  },
}), ["sports-team"], { revalidate: 60 });
