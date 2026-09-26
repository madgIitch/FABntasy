import { afterEach, describe, expect, it, vi } from "vitest";
import { createInviteToken, hashInviteToken } from "../../../../packages/domain/private-league";
import { decryptInviteToken, encryptInviteToken } from "./league-invite-crypto";

describe("league invitation secret storage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows the owner to recover a link without storing the plaintext token", () => {
    vi.stubEnv("LEAGUE_INVITE_ENCRYPTION_KEY", "test-secret-with-more-than-thirty-two-characters");
    const token = createInviteToken();
    const ciphertext = encryptInviteToken(token);
    expect(ciphertext).not.toContain(token);
    expect(decryptInviteToken(ciphertext)).toBe(token);
    expect(hashInviteToken(token)).not.toContain(token);
    expect(encryptInviteToken(token)).not.toBe(ciphertext);
  });

  it("rejects altered ciphertext and a different encryption key", () => {
    vi.stubEnv("LEAGUE_INVITE_ENCRYPTION_KEY", "first-test-secret-with-more-than-thirty-two-characters");
    const ciphertext = encryptInviteToken(createInviteToken());
    expect(() => decryptInviteToken(`${ciphertext.slice(0, -2)}xx`)).toThrow();
    vi.stubEnv("LEAGUE_INVITE_ENCRYPTION_KEY", "other-test-secret-with-more-than-thirty-two-characters");
    expect(() => decryptInviteToken(ciphertext)).toThrow();
  });
});
