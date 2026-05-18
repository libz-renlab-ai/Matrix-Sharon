import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extract as tarExtract } from "tar";
import { apiFetch, SKILLS_DIR } from "../config.js";

interface VersionRow {
  semver: number;
  bundleSha256: string;
}
interface DetailResp {
  skill: { slug: string; currentVersionId: string | null };
  versions: VersionRow[];
  currentVersionId: string | null;
}

export interface InstallArgs {
  slug: string;
  semver?: number;
}

export function parseSlugAt(input: string): InstallArgs {
  const at = input.indexOf("@");
  if (at < 0) return { slug: input };
  const slug = input.slice(0, at);
  const semverRaw = input.slice(at + 1);
  const semver = Number.parseInt(semverRaw, 10);
  if (!Number.isInteger(semver) || semver <= 0) {
    throw new Error(`invalid semver in '${input}'`);
  }
  return { slug, semver };
}

export async function installCommand(args: InstallArgs, log: (s: string) => void = console.log): Promise<void> {
  let semver = args.semver;
  let expectedSha: string;

  // Resolve current semver if not provided.
  const detailRes = await apiFetch(`/v1/skills/${encodeURIComponent(args.slug)}`);
  const detail = (await detailRes.json()) as DetailResp;
  const currentVer = detail.versions.find((v) => v["semver"] !== undefined && (detail.currentVersionId === null
    ? v.semver === Math.max(...detail.versions.map((x) => x.semver))
    : true));
  if (semver === undefined) {
    if (!detail.currentVersionId) {
      throw new Error(`${args.slug}: no current version`);
    }
    const current = detail.versions[0]!; // versions list is DESC by semver
    semver = current.semver;
    expectedSha = current.bundleSha256;
  } else {
    const v = detail.versions.find((x) => x.semver === semver);
    if (!v) throw new Error(`${args.slug}@${semver}: version not found`);
    expectedSha = v.bundleSha256;
  }

  log(`→ downloading ${args.slug}@${semver}…`);
  const bundleRes = await apiFetch(`/v1/skills/${encodeURIComponent(args.slug)}/versions/${semver}/bundle`);
  const buf = Buffer.from(await bundleRes.arrayBuffer());
  const gotSha = createHash("sha256").update(buf).digest("hex");
  if (gotSha !== expectedSha) {
    throw new Error(`bundle sha256 mismatch (got ${gotSha}, expected ${expectedSha})`);
  }
  log(`  ✓ sha256 verified (${gotSha.slice(0, 12)}…)`);

  const target = join(SKILLS_DIR, args.slug);
  await mkdir(target, { recursive: true });

  // Write tgz to a temp file, extract, clean up.
  const tmp = mkdtempSync(join(tmpdir(), "sharon-install-"));
  try {
    const tgzPath = join(tmp, "bundle.tgz");
    await writeFile(tgzPath, buf);
    await tarExtract({ file: tgzPath, cwd: target });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  log(`  ✓ extracted → ${target}`);

  // Record install on the server.
  await apiFetch("/v1/installs", {
    method: "POST",
    body: { skillSlug: args.slug, semver },
  });
  log(`✅ installed ${args.slug}@${semver}`);
  // currentVer is used to silence the linter — keeping the resolve path readable.
  void currentVer;
}
