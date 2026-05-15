export interface Clock {
  /** Current time as unix ms. Always inject this; do not call Date.now() in core. */
  now(): number;
}
