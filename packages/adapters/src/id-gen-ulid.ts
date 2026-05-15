import { ulid, monotonicFactory } from "ulid";
import type { IdGen } from "@matrix-sharon/ports";

export class UlidIdGen implements IdGen {
  private readonly mono = monotonicFactory();
  next(): string {
    return this.mono();
  }

  /** Non-monotonic variant for cases where you don't need ordering. */
  nextNonMonotonic(): string {
    return ulid();
  }
}
