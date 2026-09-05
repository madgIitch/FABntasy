import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authErrorLog, registrationErrorMessage } from "./auth-errors";
import { passwordResetRedirect, safeNextPath, validEmailOtpType } from "./safe-redirect";

describe("auth and PWA security contracts", () => {
  it("allows only local callback destinations", () => {
    expect(safeNextPath("/actualizar-clave")).toBe("/actualizar-clave");
    expect(safeNextPath("//attacker.test")).toBe("/app");
    expect(safeNextPath("/\\attacker.test")).toBe("/app");
    expect(safeNextPath("https://attacker.test")).toBe("/app");
  });

  it("supports PKCE and hashed recovery links without accepting arbitrary OTP types", () => {
    expect(validEmailOtpType("recovery")).toBe(true);
    expect(validEmailOtpType("signup")).toBe(true);
    expect(validEmailOtpType("admin")).toBe(false);
    expect(passwordResetRedirect("http://localhost:3000/path")).toBe("http://localhost:3000/auth/callback?next=/actualizar-clave");
    expect(passwordResetRedirect("javascript:alert(1)")).toBeUndefined();
  });

  it("never caches mutations or authenticated pages", () => {
    const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    expect(sw).toContain('event.request.method!=="GET"');
    expect(sw).not.toContain('"/app"');
  });

  it("declares a standalone manifest", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/app");
  });

  it("turns signup delivery failures into actionable, safe messages", () => {
    expect(registrationErrorMessage({ code: "email_address_not_authorized" })).toContain("SMTP");
    expect(registrationErrorMessage({ code: "over_email_send_rate_limit" })).toContain("límite");
    expect(registrationErrorMessage({ code: "unexpected" })).not.toContain("unexpected");
    expect(authErrorLog({ code: "email_address_invalid", status: 422 })).toEqual({
      code: "email_address_invalid",
      status: 422,
    });
  });
});
