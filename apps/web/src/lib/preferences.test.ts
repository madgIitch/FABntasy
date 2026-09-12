import { describe, expect, it } from "vitest";
import { normalizeTheme, resolveTheme } from "./preferences";

describe("theme preferences", () => {
  it("accepts only the three supported values", () => {
    expect(normalizeTheme("system")).toBe("system");
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("sepia")).toBe("system");
    expect(normalizeTheme(null)).toBe("system");
  });

  it("resolves system from prefers-color-scheme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
