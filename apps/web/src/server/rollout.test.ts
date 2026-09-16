import { describe, expect, it } from "vitest";
import { isRolloutBypass, parseRolloutUpdate, RolloutError } from "./rollout";

describe("controlled rollout", () => {
  it("only bypasses the two exact canonical usernames", () => {
    expect(isRolloutBypass("pvto_pepe")).toBe(true);
    expect(isRolloutBypass("FVCKING_PEPE")).toBe(true);
    expect(isRolloutBypass("pvto_pepe_2")).toBe(false);
    expect(isRolloutBypass("pepe")).toBe(false);
    expect(isRolloutBypass(null)).toBe(false);
  });

  it("requires a valid state and optimistic version", () => {
    expect(parseRolloutUpdate({ state: "OPEN", version: 3 })).toEqual({ state: "OPEN", version: 3 });
    expect(() => parseRolloutUpdate({ state: "open", version: 3 })).toThrowError(RolloutError);
    expect(() => parseRolloutUpdate({ state: "PREVIEW", version: -1 })).toThrowError(RolloutError);
  });
});
