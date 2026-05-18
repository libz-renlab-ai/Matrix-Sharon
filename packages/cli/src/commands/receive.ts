import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { extract as tarExtract } from "tar";
import { PUSH_KINDS, type PushKindId } from "@matrix-sharon/types";
import { apiFetch, SKILLS_DIR } from "../config.js";

interface InboxItem {
  push: {
    id: string;
    kind: PushKindId;
    skillSlug: string;
    skillVersionId: string | null;
    fromLeaderId: string;
    reason: string;
    pushedAt: number;
  };
  receipt: {
    status: "pending" | "installed" | "failed" | "uninstalled";
    acknowledged: boolean;
  };
}

/** Expand "~/" and "{name}" in handler target paths. */
export function expandHandlerPath(template: string, name: string): string {
  const withName = template.replace(/\{name\}/g, name);
  if (withName.startsWith("~/")) return resolve(homedir(), withName.slice(2));
  return withName;
}

async function downloadAndVerify(
  slug: string,
  versionId: string
): Promise<Buffer> {
  // Look up the version's semver via /v1/skills/:slug (so we don't need a separate endpoint).
  const detailRes = await apiFetch(`/v1/skills/${encodeURIComponent(slug)}`);
  const detail = (await detailRes.json()) as {
    versions: Array<{ id: string; semver: number; bundleSha256: string }>;
  };
  const v = detail.versions.find((x) => x.id === versionId);
  if (!v) throw new Error(`version ${versionId} not found for ${slug}`);
  const bundleRes = await apiFetch(
    `/v1/skills/${encodeURIComponent(slug)}/versions/${v.semver}/bundle`
  );
  const buf = Buffer.from(await bundleRes.arrayBuffer());
  const gotSha = createHash("sha256").update(buf).digest("hex");
  if (gotSha !== v.bundleSha256) {
    throw new Error(`bundle sha256 mismatch (got ${gotSha}, expected ${v.bundleSha256})`);
  }
  return buf;
}

async function extractToSkillsDir(buf: Buffer, slug: string): Promise<string> {
  const def = PUSH_KINDS["skill"];
  if (def.handler.type !== "fs-extract") throw new Error("unexpected handler type for skill");
  const target = expandHandlerPath(def.handler.targetDir, slug);
  // Normalize {name} substitution against SKILLS_DIR for clarity (matches Phase 5 install path).
  const finalTarget = target.includes(slug) ? target : join(SKILLS_DIR, slug);
  await mkdir(finalTarget, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "sharon-receive-"));
  try {
    const tgzPath = join(tmp, "bundle.tgz");
    await writeFile(tgzPath, buf);
    await tarExtract({ file: tgzPath, cwd: finalTarget });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  return finalTarget;
}

export async function receiveCommand(log: (s: string) => void = console.log): Promise<void> {
  const inboxRes = await apiFetch("/v1/pushes/inbox");
  const { items } = (await inboxRes.json()) as { items: InboxItem[] };
  const pending = items.filter((i) => i.receipt.status === "pending");
  if (pending.length === 0) {
    log("(no pending pushes)");
    return;
  }
  log(`→ ${pending.length} pending push(es)`);
  let installed = 0;
  let failed = 0;
  for (const item of pending) {
    const { push } = item;
    const def = PUSH_KINDS[push.kind];
    if (!def?.available) {
      log(`  ⚠ kind '${push.kind}' not available; skipping ${push.id}`);
      continue;
    }
    if (def.handler.type !== "fs-extract") {
      log(`  ⚠ kind '${push.kind}' handler '${def.handler.type}' not supported in v1; skipping`);
      continue;
    }
    if (!push.skillVersionId) {
      log(`  ⚠ push ${push.id} has no skill_version_id; skipping`);
      continue;
    }
    log(`  → ${push.skillSlug} (from @${push.fromLeaderId}, reason: ${push.reason})`);
    try {
      const buf = await downloadAndVerify(push.skillSlug, push.skillVersionId);
      const target = await extractToSkillsDir(buf, push.skillSlug);
      log(`    ✓ extracted → ${target}`);
      await apiFetch(`/v1/pushes/${push.id}/receipts/done`, { method: "POST" });
      installed++;
    } catch (err) {
      const reason = (err as Error).message ?? String(err);
      log(`    ✗ ${reason}`);
      await apiFetch(`/v1/pushes/${push.id}/receipts/failed`, {
        method: "POST",
        body: { reason },
      });
      failed++;
    }
  }
  log(`✅ receive done (installed=${installed}, failed=${failed})`);
}
