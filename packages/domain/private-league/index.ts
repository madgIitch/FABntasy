import { createHash, randomBytes } from "node:crypto";

export const FANTASY_LEAGUE_SCHEMA_VERSION = "fantasy-league-api.v1" as const;
export const MAX_LEAGUE_MEMBERS = 20;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
export type LeagueErrorCode = "AUTH_REQUIRED" | "LEAGUE_NOT_FOUND" | "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_REVOKED" | "ALREADY_MEMBER" | "LEAGUE_FULL" | "OWNER_CANNOT_LEAVE" | "CONFIRMATION_REQUIRED" | "VERSION_CONFLICT" | "FEATURE_DISABLED" | "INVALID_INPUT";
export function createInviteToken() { return randomBytes(16).toString("base64url"); }
export function hashInviteToken(token: string) { if (!/^[A-Za-z0-9_-]{22}$/.test(token)) throw new Error("INVITE_INVALID"); return createHash("sha256").update(token).digest("hex"); }
export function validLeagueName(name: string) { const value = name.trim(); if (value.length < 3 || value.length > 60) throw new Error("INVALID_INPUT"); return value; }
export function canManageLeague(role: string) { return role === "OWNER"; }
