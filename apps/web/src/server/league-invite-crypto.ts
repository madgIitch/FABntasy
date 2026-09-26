import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.LEAGUE_INVITE_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) throw Object.assign(new Error("LEAGUE_INVITE_ENCRYPTION_KEY_REQUIRED"), { code: "SERVICE_UNAVAILABLE", status: 503 });
  return createHash("sha256").update("canastio:league-invite:v1:").update(secret).digest();
}

export function encryptInviteToken(token: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${nonce.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptInviteToken(value: string) {
  const [nonce, encrypted, tag] = value.split(".");
  if (!nonce || !encrypted || !tag) throw new Error("INVITE_CIPHERTEXT_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
