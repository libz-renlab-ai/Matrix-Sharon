import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { create as tarCreate } from "tar";
import { FsBundleStore } from "../bundle/fs.js";

const SEED_USER_ID = "system-seed";

// Deterministic ULIDs so seed across invocations / machines stays stable.
const VERSION_IDS = {
  "sql-safety-gate": "01JABCSEEDSAFETYGATEAAAAAA",
  "pr-review-checklist": "01JABCSEEDPRREVIEWBBBBBBBB",
  "i18n-key-finder": "01JABCSEEDI18NFINDERCCCCCC",
} as const;

interface SeedResult {
  skillsInserted: number;
  versionsInserted: number;
  userInserted: boolean;
}

interface SeedSkill {
  slug: keyof typeof VERSION_IDS;
  name: string;
  category: string;
  icon: string;
  description: string;
  pain: string;
  gain: string;
  triggers: string;
  readme: string;
}

const SEEDS: SeedSkill[] = [
  {
    slug: "sql-safety-gate",
    name: "SQL 安全闸门",
    category: "safety",
    icon: "🛡️",
    description: "在 Claude 准备运行任何破坏性 SQL 之前拦下来。",
    pain: "Claude 半夜要跑 DROP TABLE 时人在睡觉，醒来全员回滚到天亮。",
    gain: "所有破坏性 SQL 进 PreToolUse hook，强制 EXPLAIN + 行数估算 + 二次确认。",
    triggers: "Claude 准备运行任何含 DROP / TRUNCATE / UPDATE-无-WHERE 的 SQL。",
    readme:
      "# sql-safety-gate\n\n## 它做什么\n\n在 Claude 运行任何破坏性 SQL 前，强制 EXPLAIN + 行数估算 + 二次确认。\n\n## 触发条件\n\n- `DROP TABLE`\n- `TRUNCATE`\n- `UPDATE` 不带 `WHERE`\n- `DELETE` 不带 `WHERE`\n\n## 用法\n\n安装后自动接管 PreToolUse hook，无需手动调用。\n",
  },
  {
    slug: "pr-review-checklist",
    name: "PR Review 清单",
    category: "review",
    icon: "🔎",
    description: "把团队 review 共识固化成 checklist，PR 一开就跑。",
    pain: "新成员漏掉团队约定的 30 条 review 规则，老成员每次都靠脑子记。",
    gain: "PR 创建时 Claude 自动跑 checklist，分项报告 pass/fail，留下评论。",
    triggers: "GitHub PR opened / synchronize 事件，或本地 `claude review` 命令。",
    readme:
      "# pr-review-checklist\n\n## 30 条规则\n\n按 category 分组：\n\n- **安全**：SQL injection、XSS、secret 泄漏\n- **性能**：N+1 query、未加索引、同步 IO\n- **可维护性**：函数过长、嵌套过深、命名差\n\n## 输出\n\n`✅ 通过 · ⚠️ 警告 · ❌ 阻塞` 三档。\n",
  },
  {
    slug: "i18n-key-finder",
    name: "i18n key 查找器",
    category: "i18n",
    icon: "🌍",
    description: "找出代码里硬编码的字符串，提示走 i18n 通道。",
    pain: "PR 合进去后才发现哪里漏了 i18n 包装，QA 在 zh-TW 环境里看到英文。",
    gain: "Claude 写 UI 文案时自动检测硬编码字符串，建议 i18n.t(key)。",
    triggers: "编辑 `.tsx`/`.vue`/`.svelte` 时检测引号里的中英文字符串。",
    readme:
      "# i18n-key-finder\n\n扫描代码里硬编码的 UI 字符串。\n\n## 检测规则\n\n- 长度 ≥ 4 的英文短语，且不在测试 / 注释里\n- 任何中文字符串\n- JSX 文本节点\n\n## 建议输出\n\n```tsx\n- <button>Submit</button>\n+ <button>{t('common.submit')}</button>\n```\n",
  },
];

/**
 * Seed sample skills into the DB. Idempotent — uses INSERT OR IGNORE.
 * Inserts a synthetic 'system-seed' user as the author so first-real-login
 * leader bootstrap is not disturbed.
 */
/** Build a 1-file SKILL.md tgz and return {bytes, sha256}. */
async function packReadmeAsBundle(slug: string, readme: string): Promise<{ bytes: Buffer; sha256: string }> {
  const dir = await mkdtemp(join(tmpdir(), `sharon-seed-${slug}-`));
  try {
    const filePath = join(dir, "SKILL.md");
    await writeFile(filePath, readme, "utf8");
    const archivePath = join(dir, "bundle.tgz");
    await tarCreate(
      { file: archivePath, cwd: dir, gzip: true, portable: true },
      ["SKILL.md"]
    );
    const bytes = await readFile(archivePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return { bytes, sha256 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function seedSampleSkills(
  db: Database.Database,
  opts: { bundleStore?: { put(slug: string, versionId: string, bytes: Buffer): Promise<{ sha256: string; size: number }> } | null } = {}
): Promise<SeedResult> {
  const now = Date.now();

  // 1. system-seed user (raw INSERT — does NOT use UserStore.upsertFromGithub).
  const userExists = db
    .prepare("SELECT 1 FROM users WHERE id = ?")
    .get(SEED_USER_ID);
  let userInserted = false;
  if (!userExists) {
    db.prepare(
      `INSERT INTO users (id, github_id, name, email, avatar_url, role, created_at, last_seen_at)
       VALUES (?, 0, 'Sharon Seed', NULL, NULL, 'member', ?, NULL)`
    ).run(SEED_USER_ID, now);
    userInserted = true;
  }

  // 2. skills + versions.
  // Pre-build bundles outside the DB transaction (mkdtemp/tar/fs are async).
  const bundles = new Map<string, { bytes: Buffer; sha256: string }>();
  for (const s of SEEDS) {
    bundles.set(s.slug, await packReadmeAsBundle(s.slug, s.readme));
  }

  let skillsInserted = 0;
  let versionsInserted = 0;
  const tx = db.transaction(() => {
    for (const s of SEEDS) {
      const versionId = VERSION_IDS[s.slug];
      const bundle = bundles.get(s.slug)!;
      const skillExisted = db.prepare("SELECT 1 FROM skills WHERE slug = ?").get(s.slug);
      if (!skillExisted) {
        db.prepare(
          `INSERT INTO skills (slug, name, category, icon, author_id, created_at, current_version_id)
           VALUES (?, ?, ?, ?, ?, ?, NULL)`
        ).run(s.slug, s.name, s.category, s.icon, SEED_USER_ID, now);
        skillsInserted++;
      }
      const verExisted = db
        .prepare("SELECT 1 FROM skill_versions WHERE id = ?")
        .get(versionId);
      if (!verExisted) {
        db.prepare(
          `INSERT INTO skill_versions
           (id, skill_slug, semver, bundle_sha256, bundle_size, description,
            pain, gain, triggers, example_json, readme_md, note,
            published_by, approved_by, approved_at, published_at)
           VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?)`
        ).run(
          versionId,
          s.slug,
          bundle.sha256,
          bundle.bytes.length,
          s.description,
          s.pain,
          s.gain,
          s.triggers,
          s.readme,
          SEED_USER_ID,
          SEED_USER_ID,
          now,
          now
        );
        versionsInserted++;
      }
      // Always ensure current_version_id points at the seed version.
      db.prepare("UPDATE skills SET current_version_id = ? WHERE slug = ?").run(versionId, s.slug);
    }
  });
  tx();

  // 3. Persist bundle bytes so /v1/skills/:slug/versions/:semver/bundle works.
  // Pass bundleStore: null to opt out (tests don't need real files on disk).
  const bundleStore = opts.bundleStore === null
    ? null
    : opts.bundleStore ?? new FsBundleStore();
  if (bundleStore) {
    for (const s of SEEDS) {
      const versionId = VERSION_IDS[s.slug];
      const b = bundles.get(s.slug)!;
      await bundleStore.put(s.slug, versionId, b.bytes);
    }
  }

  return { skillsInserted, versionsInserted, userInserted };
}
