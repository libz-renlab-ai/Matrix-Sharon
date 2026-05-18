import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import type { BundleStore } from "@matrix-sharon/ports";
import { resolveBundleDir } from "../storage/sqlite/paths.js";

export interface FsBundleStoreOptions {
  /** Override the data dir (else SHARON_DATA_DIR or cwd/data). */
  dataDir?: string;
}

export class FsBundleStore implements BundleStore {
  private readonly bundleDir: string;

  constructor(opts: FsBundleStoreOptions = {}) {
    this.bundleDir = opts.dataDir ? join(opts.dataDir, "bundles") : resolveBundleDir();
  }

  private path(slug: string, versionId: string): string {
    return join(this.bundleDir, slug, `${versionId}.tgz`);
  }

  async put(slug: string, versionId: string, bytes: Buffer): Promise<{ sha256: string; size: number }> {
    const p = this.path(slug, versionId);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return { sha256, size: bytes.length };
  }

  async get(slug: string, versionId: string): Promise<Buffer> {
    return readFile(this.path(slug, versionId));
  }

  async verify(slug: string, versionId: string, expectedSha256: string): Promise<boolean> {
    const bytes = await this.get(slug, versionId);
    const got = createHash("sha256").update(bytes).digest("hex");
    return got === expectedSha256;
  }
}
