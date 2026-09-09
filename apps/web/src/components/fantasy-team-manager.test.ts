import { describe, expect, it } from "vitest";
import { nextLineupSelection } from "./fantasy-team-manager";

describe("lineup selection", () => {
  it("promotes a substitute immediately when the starting five is incomplete", () => {
    expect(nextLineupSelection(["p1", "p2", "p3", "p4"], null, "p5")).toEqual({
      starters: ["p1", "p2", "p3", "p4", "p5"],
      selectedId: null
    });
  });

  it("keeps the two-tap swap interaction once there are five starters", () => {
    const starters = ["p1", "p2", "p3", "p4", "p5"];
    expect(nextLineupSelection(starters, "p2", "p6")).toEqual({
      starters: ["p1", "p6", "p3", "p4", "p5"],
      selectedId: null
    });
  });
});
