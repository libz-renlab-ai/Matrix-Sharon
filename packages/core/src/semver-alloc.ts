/** Next semver = currentMax + 1. v1 has no minor/patch — every approval bumps. */
export function nextSemver(currentMax: number): number {
  if (!Number.isInteger(currentMax) || currentMax < 0) {
    throw new Error(`nextSemver: currentMax must be a non-negative integer, got ${currentMax}`);
  }
  return currentMax + 1;
}
