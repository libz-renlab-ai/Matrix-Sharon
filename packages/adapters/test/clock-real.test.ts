import { describe, it, expect } from "vitest";
import { RealClock } from "../src/clock-real.js";

describe("RealClock", () => {
  it("now() returns a positive integer in milliseconds", () => {
    const c = new RealClock();
    const t = c.now();
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThan(1_700_000_000_000); // sometime after 2023
  });

  it("monotonic across two calls (within tolerance)", () => {
    const c = new RealClock();
    const a = c.now();
    const b = c.now();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
