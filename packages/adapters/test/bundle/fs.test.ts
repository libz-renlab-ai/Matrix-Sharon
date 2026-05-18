import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { FsBundleStore } from "../../src/bundle/fs.js";

const tmpDirs: string[] = [];
function makeTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-bundle-test-"));
  tmpDirs.push(dir);
  return dir;
}

let store: FsBundleStore;
let dataDir: string;

beforeEach(() => {
  dataDir = makeTmpDir();
  store = new FsBundleStore({ dataDir });
});

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

const bytes = Buffer.from("hello world bundle bytes", "utf8");
const expectedSha = createHash("sha256").update(bytes).digest("hex");

describe("FsBundleStore", () => {
  it("put writes the file and returns sha256+size", async () => {
    const r = await store.put("sql-safety-gate", "v-1", bytes);
    expect(r.sha256).toBe(expectedSha);
    expect(r.size).toBe(bytes.length);
    expect(existsSync(join(dataDir, "bundles", "sql-safety-gate", "v-1.tgz"))).toBe(true);
  });

  it("get reads back identical bytes", async () => {
    await store.put("x", "v1", bytes);
    const got = await store.get("x", "v1");
    expect(got.equals(bytes)).toBe(true);
  });

  it("get throws when bundle missing", async () => {
    await expect(store.get("x", "v999")).rejects.toThrow();
  });

  it("verify true when sha matches", async () => {
    await store.put("x", "v1", bytes);
    expect(await store.verify("x", "v1", expectedSha)).toBe(true);
  });

  it("verify false when sha differs", async () => {
    await store.put("x", "v1", bytes);
    expect(await store.verify("x", "v1", "0".repeat(64))).toBe(false);
  });

  it("multiple slugs/versions co-exist", async () => {
    const a = Buffer.from("a");
    const b = Buffer.from("b");
    await store.put("x", "v1", a);
    await store.put("y", "v1", b);
    expect((await store.get("x", "v1")).equals(a)).toBe(true);
    expect((await store.get("y", "v1")).equals(b)).toBe(true);
  });
});
