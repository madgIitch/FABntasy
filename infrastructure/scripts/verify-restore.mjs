import { execFileSync } from "node:child_process";
const url = process.env.RESTORE_DATABASE_URL;
if (!url || !/restore|recovery|isolated|staging/i.test(new URL(url).hostname + new URL(url).pathname)) throw new Error("refusing restore verification outside an explicitly isolated target");
if (url === process.env.DATABASE_URL || url === process.env.DIRECT_URL) throw new Error("restore target matches production");
const sql = `SELECT CASE WHEN (SELECT count(*) FROM competition_seasons WHERE fantasy_role='primary') <= 1 AND NOT EXISTS (SELECT 1 FROM fantasy_teams ft JOIN fantasy_leagues fl ON fl.id=ft.league_id WHERE ft.competition_season_id<>fl.competition_season_id) AND NOT EXISTS (SELECT 1 FROM games g JOIN groups gr ON gr.id=g.group_id WHERE g.competition_season_id<>gr.competition_season_id) THEN 'OK' ELSE 'INVALID' END;`;
const result = execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
if (result !== "OK") throw new Error("restored database invariants failed");
console.log(JSON.stringify({ status: "OK", verifiedAt: new Date().toISOString() }));
