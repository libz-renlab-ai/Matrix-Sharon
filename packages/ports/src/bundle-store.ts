export interface BundleStore {
  /** Save bundle bytes and return sha256. */
  put(slug: string, versionId: string, bytes: Buffer): Promise<{ sha256: string; size: number }>;
  /** Read bundle bytes; throws if not found. */
  get(slug: string, versionId: string): Promise<Buffer>;
  /** Verify on-disk bundle matches expected sha256. */
  verify(slug: string, versionId: string, expectedSha256: string): Promise<boolean>;
}
