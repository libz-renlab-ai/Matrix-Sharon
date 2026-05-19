import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import type { BundleStore } from "@matrix-sharon/ports";
import { SLUG_PATTERN } from "@matrix-sharon/core";
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
    // Defense-in-depth: even if a caller bypasses the zod route guard, refuse
    // anything that doesn't match the canonical slug format. Also refuse
    // versionId with separators (it's a ULID from server code, so this is paranoia).
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(`refusing to use invalid slug: ${JSON.stringify(slug)}`);
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(versionId)) {
      throw new Error(`refusing to use invalid versionId: ${JSON.stringify(versionId)}`);
    }
    const candidate = join(this.bundleDir, slug, `${versionId}.tgz`);
    // Belt-and-braces: ensure the resolved path stays inside bundleDir.
    const rel = relative(this.bundleDir, candidate);
    if (rel.startsWith("..") || rel.includes("..")) {
      throw new Error(`refusing path escape: ${rel}`);
    }
    return candidate;
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
