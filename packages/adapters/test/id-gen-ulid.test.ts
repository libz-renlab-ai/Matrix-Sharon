import { describe, it, expect } from "vitest";
import { UlidIdGen } from "../src/id-gen-ulid.js";

describe("UlidIdGen", () => {
  it("next() returns a 26-char ULID", () => {
    const g = new UlidIdGen();
    const id = g.next();
    expect(typeof id).toBe("string");
    expect(id).toHaveLength(26);
  });

  it("two calls return distinct ids", () => {
    const g = new UlidIdGen();
    const a = g.next();
    const b = g.next();
    expect(a).not.toBe(b);
  });

  it("monotonically sortable (lexicographic) across calls", () => {
    const g = new UlidIdGen();
    const a = g.next();
    const b = g.next();
    expect(a <= b).toBe(true);
  });
});
