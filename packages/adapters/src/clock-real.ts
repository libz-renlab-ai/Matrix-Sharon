import type { Clock } from "@matrix-sharon/ports";

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }
}
