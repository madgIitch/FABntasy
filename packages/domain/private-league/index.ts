import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export const FANTASY_LEAGUE_SCHEMA_VERSION = "fantasy-league-api.v1" as const;
export const MAX_LEAGUE_MEMBERS = 20;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
export type LeagueErrorCode = "AUTH_REQUIRED" | "LEAGUE_NOT_FOUND" | "COMPETITION_DISABLED" | "INVALID_CREDENTIALS" | "PASSWORD_REQUIRED" | "RATE_LIMITED" | "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_REVOKED" | "ALREADY_MEMBER" | "LEAGUE_FULL" | "OWNER_CANNOT_LEAVE" | "CONFIRMATION_REQUIRED" | "VERSION_CONFLICT" | "FEATURE_DISABLED" | "INVALID_INPUT";
export function createInviteToken() { return randomBytes(16).toString("base64url"); }
export function hashInviteToken(token: string) { if (!/^[A-Za-z0-9_-]{22}$/.test(token)) throw new Error("INVITE_INVALID"); return createHash("sha256").update(token).digest("hex"); }
export function validLeagueName(name: string) { const value = name.trim(); if (value.length < 3 || value.length > 60) throw new Error("INVALID_INPUT"); return value; }
export function canManageLeague(role: string) { return role === "OWNER"; }
const scrypt = promisify(scryptCallback);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function createLeagueCode(){const bytes=randomBytes(6);return `CNST-${Array.from(bytes,b=>CODE_ALPHABET[b%CODE_ALPHABET.length]).join("")}`;}
export function normalizeLeagueCode(code:string){const value=code.trim().toUpperCase();if(!/^CNST-[A-Z2-9]{6}$/.test(value))throw new Error("INVALID_CREDENTIALS");return value;}
export function validLeaguePassword(password:string){if(password.length<6||password.length>72)throw new Error("PASSWORD_REQUIRED");return password;}
export async function hashLeaguePassword(password:string){validLeaguePassword(password);const salt=randomBytes(16);const key=await scrypt(password,salt,32) as Buffer;return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;}
export async function verifyLeaguePassword(password:string,encoded:string){const [,saltPart,keyPart]=encoded.split("$");if(!saltPart||!keyPart)return false;const expected=Buffer.from(keyPart,"base64url");const actual=await scrypt(password,Buffer.from(saltPart,"base64url"),expected.length) as Buffer;return actual.length===expected.length&&timingSafeEqual(actual,expected);}
