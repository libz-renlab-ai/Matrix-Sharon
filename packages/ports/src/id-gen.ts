export interface IdGen {
  /** Monotonic-friendly id (ULID in production). Always inject in core. */
  next(): string;
}
