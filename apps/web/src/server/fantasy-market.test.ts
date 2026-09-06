import { describe,expect,it } from "vitest";
import { calculateClauseBase } from "./fantasy-market";

describe("fantasy market rules",()=>{
  it("uses 175% of the greater acquisition or current price",()=>{
    expect(calculateClauseBase(10_000_000n,12_000_000n)).toBe(21_000_000n);
    expect(calculateClauseBase(15_000_000n,12_000_000n)).toBe(26_250_000n);
  });
  it("rounds half-up to an integer credit",()=>expect(calculateClauseBase(101n,100n)).toBe(177n));
});
