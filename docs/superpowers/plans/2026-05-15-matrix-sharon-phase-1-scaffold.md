# Matrix-Sharon Phase 1: Scaffold & DB Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a buildable pnpm monorepo with 7 packages, runnable SQLite migrations, green `pnpm -r typecheck && pnpm -r test`, and CI passing — nothing user-facing yet, but the foundation for Phase 2+ is locked.

**Architecture:** pnpm workspace · TypeScript strict mode · Node 22+ · Functional-Core/Imperative-Shell layering (types/ports/core/adapters/server/web/cli) · `better-sqlite3` for storage · `vitest` for tests · GitHub Actions for CI.

**Tech Stack:** pnpm 9, TypeScript 5.6+, Node 22, vitest 2, better-sqlite3 11, zod 3, ulid 2, fastify 5 (placeholder only), astro 5 (placeholder only).

**Spec:** [`docs/superpowers/specs/2026-05-15-matrix-sharon-design.md`](../specs/2026-05-15-matrix-sharon-design.md)

**Out of scope for Phase 1:** OAuth flow, REST routes, Web pages, CLI commands, skill compiler, push delivery. All packages exist as scaffolds that compile but expose minimal/placeholder logic.

---

## File Structure (locked after Phase 1)

```
matrix-sharon/
├─ pnpm-workspace.yaml
├─ package.json                         (root)
├─ tsconfig.base.json
├─ .nvmrc                               (Node version)
├─ .github/workflows/ci.yml
├─ packages/
│   ├─ types/
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   ├─ src/
│   │   │   ├─ index.ts                 (barrel)
│   │   │   ├─ users.ts                 (User, Role)
│   │   │   ├─ skills.ts                (Skill, SkillVersion, Category, Frontmatter)
│   │   │   ├─ candidates.ts            (Candidate)
│   │   │   ├─ submissions.ts           (PendingSubmission, SubmissionStatus)
│   │   │   ├─ pushes.ts                (Push, PushReceipt, PushReceiptStatus)
│   │   │   ├─ push-kinds.ts            (PushKindId, PushKindDef, PUSH_KINDS)
│   │   │   ├─ installs.ts              (Install, InstallToken)
│   │   │   └─ team-config.ts           (TeamConfig)
│   │   └─ test/
│   │       └─ push-kinds.test.ts       (smoke: registry shape)
│   │
│   ├─ ports/
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   └─ src/
│   │       ├─ index.ts                 (barrel)
│   │       ├─ user-store.ts            (UserStore interface)
│   │       ├─ skill-store.ts           (SkillStore interface)
│   │       ├─ submission-store.ts      (SubmissionStore interface)
│   │       ├─ candidate-store.ts       (CandidateStore interface)
│   │       ├─ push-store.ts            (PushStore interface)
│   │       ├─ install-store.ts         (InstallStore interface)
│   │       ├─ bundle-store.ts          (BundleStore interface)
│   │       ├─ audit-log.ts             (AuditLog interface)
│   │       ├─ clock.ts                 (Clock — for testable time)
│   │       └─ id-gen.ts                (IdGen — for testable ULID)
│   │
│   ├─ core/
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   └─ src/
│   │       └─ index.ts                 (placeholder export — fleshed out in Phase 4+)
│   │
│   ├─ adapters/
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   ├─ src/
│   │   │   ├─ index.ts                 (barrel)
│   │   │   ├─ clock-real.ts            (real Clock)
│   │   │   ├─ id-gen-ulid.ts           (real IdGen via ulid)
│   │   │   └─ storage/sqlite/
│   │   │       ├─ db.ts                (open + WAL setup)
│   │   │       ├─ migrations/
│   │   │       │   └─ 001_initial.sql  (the 10 tables from spec §8)
│   │   │       ├─ migrate.ts           (migration runner)
│   │   │       └─ paths.ts             (data dir resolution)
│   │   └─ test/
│   │       ├─ clock-real.test.ts
│   │       ├─ id-gen-ulid.test.ts
│   │       └─ storage/sqlite/migrate.test.ts
│   │
│   ├─ server/
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   └─ src/
│   │       └─ index.ts                 (Fastify hello-world)
│   │
│   ├─ web/
│   │   ├─ package.json
│   │   ├─ astro.config.mjs
│   │   ├─ tsconfig.json
│   │   └─ src/
│   │       └─ pages/
│   │           └─ index.astro          (hello-world)
│   │
│   └─ cli/
│       ├─ package.json
│       ├─ tsconfig.json
│       └─ src/
│           └─ bin.ts                   (sharon --help placeholder)
│
└─ data/                                (gitignored, created at runtime)
```

**Dependency direction (enforced by package.json deps):**

```
types  ←  ports  ←  core  ←  adapters  ←  server / cli
                                    ↑
                                  web (HTTP only, no direct deps)
```

---

### Task 1: pnpm workspace + root tsconfig + ignored files

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Modify: `.gitignore` (add `data/`, `*.tsbuildinfo`)

- [ ] **Step 1: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "matrix-sharon",
  "version": "0.0.0",
  "private": true,
  "description": "团队技能集市 — Claude Code skills 共享平台",
  "type": "module",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9"
  },
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "dev": "echo '(dev orchestrator — added in Phase 2)' && exit 0"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 3: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Write `.nvmrc`**

```
22
```

- [ ] **Step 5: Append to `.gitignore`** (file already exists)

```
# Phase 1 additions
data/
*.tsbuildinfo
.turbo/
```

- [ ] **Step 6: Run `pnpm install`**

Run: `pnpm install`
Expected: "Lockfile is up to date" or creates `pnpm-lock.yaml`. No errors.

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .nvmrc .gitignore pnpm-lock.yaml
git commit -m "chore: pnpm workspace skeleton + base tsconfig + Node 22 pin"
```

---

### Task 2: packages/types — core type definitions

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/users.ts`
- Create: `packages/types/src/skills.ts`
- Create: `packages/types/src/candidates.ts`
- Create: `packages/types/src/submissions.ts`
- Create: `packages/types/src/pushes.ts`
- Create: `packages/types/src/push-kinds.ts`
- Create: `packages/types/src/installs.ts`
- Create: `packages/types/src/team-config.ts`
- Create: `packages/types/test/push-kinds.test.ts`

- [ ] **Step 1: Write `packages/types/package.json`**

```json
{
  "name": "@matrix-sharon/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Write `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/types/src/users.ts`**

```typescript
import { z } from "zod";

export const RoleSchema = z.enum(["leader", "member"]);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),               // GitHub login
  githubId: z.number().int(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: RoleSchema,
  createdAt: z.number().int(),  // unix ms
  lastSeenAt: z.number().int().nullable(),
});
export type User = z.infer<typeof UserSchema>;
```

- [ ] **Step 4: Write `packages/types/src/skills.ts`**

```typescript
import { z } from "zod";

export const CategorySchema = z.enum([
  "safety", "review", "debug", "write", "perf", "test", "i18n", "git",
]);
export type Category = z.infer<typeof CategorySchema>;

/** SKILL.md frontmatter — Sharon's superset of Claude Code's required fields. */
export const FrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  pain: z.string().optional(),
  gain: z.string().optional(),
  triggers: z.string().optional(),
  category: CategorySchema.optional(),
  icon: z.string().optional(),
  example: z.object({
    user: z.string().optional(),
    sharon: z.string().optional(),
    deny: z.string().optional(),
  }).optional(),
});
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export const SkillSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: CategorySchema.nullable(),
  icon: z.string().nullable(),
  authorId: z.string(),
  createdAt: z.number().int(),
  currentVersionId: z.string().nullable(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const SkillVersionSchema = z.object({
  id: z.string(),               // ULID
  skillSlug: z.string(),
  semver: z.number().int().positive(),  // 1, 2, 3 ... (UI shows "v1")
  bundleSha256: z.string(),
  bundleSize: z.number().int().nonnegative(),
  description: z.string(),
  pain: z.string().nullable(),
  gain: z.string().nullable(),
  triggers: z.string().nullable(),
  exampleJson: z.string().nullable(),
  readmeMd: z.string(),
  note: z.string().nullable(),
  publishedBy: z.string(),
  approvedBy: z.string(),
  approvedAt: z.number().int(),
  publishedAt: z.number().int(),
});
export type SkillVersion = z.infer<typeof SkillVersionSchema>;
```

- [ ] **Step 5: Write `packages/types/src/candidates.ts`**

```typescript
import { z } from "zod";

export const CandidateSchema = z.object({
  id: z.string(),               // ULID
  userId: z.string(),
  skillSlug: z.string(),        // local slug
  detectedAt: z.number().int(),
  reason: z.string(),
  diffUnified: z.string().nullable(),
  fullContentMd: z.string(),
  dismissed: z.boolean(),
});
export type Candidate = z.infer<typeof CandidateSchema>;
```

- [ ] **Step 6: Write `packages/types/src/submissions.ts`**

```typescript
import { z } from "zod";

export const SubmissionStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const PendingSubmissionSchema = z.object({
  id: z.string(),
  skillSlug: z.string(),
  isNewSkill: z.boolean(),
  bundleSha256: z.string(),
  bundleSize: z.number().int().nonnegative(),
  rawSkillMd: z.string(),
  submitterId: z.string(),
  submittedAt: z.number().int(),
  status: SubmissionStatusSchema,
  reviewerId: z.string().nullable(),
  reviewedAt: z.number().int().nullable(),
  rejectReason: z.string().nullable(),
});
export type PendingSubmission = z.infer<typeof PendingSubmissionSchema>;
```

- [ ] **Step 7: Write `packages/types/src/push-kinds.ts`**

```typescript
import { z } from "zod";

export const PushKindIdSchema = z.enum([
  "skill",
  "viki-rule",
  "workflow",
  "prompt-template",
]);
export type PushKindId = z.infer<typeof PushKindIdSchema>;

/** Where the receiver-side dispatcher puts the payload for a given kind. */
export type PushKindHandler =
  | { type: "fs-extract";    targetDir: string }   // extract bundle.tgz to dir
  | { type: "fs-write-file"; targetPath: string }  // write single file
  | { type: "delegate-cli";  cmd: string };        // invoke external CLI

export interface PushKindDef {
  id: PushKindId;
  label: string;
  icon: string;
  available: boolean;
  desc: string;
  handler: PushKindHandler;
  eta?: string;
}

/**
 * Push types registry. Adding a new kind = adding one entry here +
 * implementing the corresponding handler dispatch in the receiver-side
 * sharon CLI dispatcher. v1 ships only `skill` as `available: true`.
 *
 * Viki integration boundary: kind=viki-rule delegates to `viki import-rules`
 * — Sharon does not need to know what's inside the bundle.
 */
export const PUSH_KINDS: Record<PushKindId, PushKindDef> = {
  "skill": {
    id: "skill",
    label: "Skill",
    icon: "🧩",
    available: true,
    desc: "Claude Code 原生 skill 目录",
    handler: { type: "fs-extract", targetDir: "~/.claude/skills/{name}/" },
  },
  "viki-rule": {
    id: "viki-rule",
    label: "Viki 规则",
    icon: "📐",
    available: false,
    eta: "v1.1",
    desc: "Viki 学习引擎抽出的规则包",
    handler: { type: "delegate-cli", cmd: "viki import-rules {bundle}" },
  },
  "workflow": {
    id: "workflow",
    label: "Workflow",
    icon: "🔗",
    available: false,
    eta: "v1.2",
    desc: "多步 skill 串联的 workflow 定义",
    handler: { type: "fs-extract", targetDir: "~/.claude/workflows/{name}/" },
  },
  "prompt-template": {
    id: "prompt-template",
    label: "Prompt 模板",
    icon: "💬",
    available: false,
    eta: "v1.3",
    desc: "可重用的 prompt 模板（带参数占位）",
    handler: { type: "fs-write-file", targetPath: "~/.claude/prompts/{name}.md" },
  },
};
```

- [ ] **Step 8: Write `packages/types/src/pushes.ts`**

```typescript
import { z } from "zod";
import { PushKindIdSchema } from "./push-kinds.js";

export const PushReceiptStatusSchema = z.enum([
  "pending", "installed", "failed", "uninstalled",
]);
export type PushReceiptStatus = z.infer<typeof PushReceiptStatusSchema>;

export const PushSchema = z.object({
  id: z.string(),
  kind: PushKindIdSchema,
  skillSlug: z.string(),
  skillVersionId: z.string().nullable(),
  fromLeaderId: z.string(),
  reason: z.string(),
  pushedAt: z.number().int(),
});
export type Push = z.infer<typeof PushSchema>;

export const PushReceiptSchema = z.object({
  pushId: z.string(),
  recipientId: z.string(),
  status: PushReceiptStatusSchema,
  statusChangedAt: z.number().int(),
  failReason: z.string().nullable(),
  acknowledged: z.boolean(),
});
export type PushReceipt = z.infer<typeof PushReceiptSchema>;
```

- [ ] **Step 9: Write `packages/types/src/installs.ts`**

```typescript
import { z } from "zod";

export const InstallSchema = z.object({
  userId: z.string(),
  skillSlug: z.string(),
  skillVersionId: z.string(),
  installedAt: z.number().int(),
  uninstalledAt: z.number().int().nullable(),
  viaPushId: z.string().nullable(),
});
export type Install = z.infer<typeof InstallSchema>;

export const InstallTokenSchema = z.object({
  token: z.string(),
  userId: z.string(),
  skillSlug: z.string(),
  versionId: z.string(),
  expiresAt: z.number().int(),
  consumedAt: z.number().int().nullable(),
});
export type InstallToken = z.infer<typeof InstallTokenSchema>;
```

- [ ] **Step 10: Write `packages/types/src/team-config.ts`**

```typescript
import { z } from "zod";

export const TeamConfigSchema = z.object({
  allowedGithubOrgs: z.array(z.string()),
  allowedGithubTeams: z.array(z.string()),
  updatedBy: z.string().nullable(),
  updatedAt: z.number().int().nullable(),
});
export type TeamConfig = z.infer<typeof TeamConfigSchema>;
```

- [ ] **Step 11: Write `packages/types/src/index.ts`**

```typescript
export * from "./users.js";
export * from "./skills.js";
export * from "./candidates.js";
export * from "./submissions.js";
export * from "./push-kinds.js";
export * from "./pushes.js";
export * from "./installs.js";
export * from "./team-config.js";
```

- [ ] **Step 12: Write `packages/types/test/push-kinds.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { PUSH_KINDS } from "../src/push-kinds.js";

describe("PUSH_KINDS registry", () => {
  it("has skill available in v1", () => {
    expect(PUSH_KINDS.skill.available).toBe(true);
  });

  it("has viki-rule, workflow, prompt-template as future (disabled)", () => {
    expect(PUSH_KINDS["viki-rule"].available).toBe(false);
    expect(PUSH_KINDS.workflow.available).toBe(false);
    expect(PUSH_KINDS["prompt-template"].available).toBe(false);
  });

  it("every kind has a handler", () => {
    for (const def of Object.values(PUSH_KINDS)) {
      expect(def.handler).toBeDefined();
      expect(["fs-extract", "fs-write-file", "delegate-cli"]).toContain(def.handler.type);
    }
  });

  it("viki-rule delegates to viki CLI (integration contract)", () => {
    const h = PUSH_KINDS["viki-rule"].handler;
    expect(h.type).toBe("delegate-cli");
    if (h.type === "delegate-cli") {
      expect(h.cmd).toContain("viki import-rules");
    }
  });
});
```

- [ ] **Step 13: Run install + typecheck + tests**

```bash
pnpm install
pnpm --filter @matrix-sharon/types typecheck
pnpm --filter @matrix-sharon/types test
```

Expected: typecheck clean, 4 tests pass.

- [ ] **Step 14: Commit**

```bash
git add packages/types/ pnpm-lock.yaml
git commit -m "feat(types): core type definitions + PUSH_KINDS registry"
```

---

### Task 3: packages/ports — interface definitions (no implementations)

**Files:**
- Create: `packages/ports/package.json`
- Create: `packages/ports/tsconfig.json`
- Create: `packages/ports/src/index.ts`
- Create: `packages/ports/src/clock.ts`
- Create: `packages/ports/src/id-gen.ts`
- Create: `packages/ports/src/user-store.ts`
- Create: `packages/ports/src/skill-store.ts`
- Create: `packages/ports/src/submission-store.ts`
- Create: `packages/ports/src/candidate-store.ts`
- Create: `packages/ports/src/push-store.ts`
- Create: `packages/ports/src/install-store.ts`
- Create: `packages/ports/src/bundle-store.ts`
- Create: `packages/ports/src/audit-log.ts`

- [ ] **Step 1: Write `packages/ports/package.json`**

```json
{
  "name": "@matrix-sharon/ports",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "echo 'no tests in ports' && exit 0",
    "build": "tsc"
  },
  "dependencies": {
    "@matrix-sharon/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/ports/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/ports/src/clock.ts`**

```typescript
export interface Clock {
  /** Current time as unix ms. Always inject this; do not call Date.now() in core. */
  now(): number;
}
```

- [ ] **Step 4: Write `packages/ports/src/id-gen.ts`**

```typescript
export interface IdGen {
  /** Monotonic-friendly id (ULID in production). Always inject in core. */
  next(): string;
}
```

- [ ] **Step 5: Write `packages/ports/src/user-store.ts`**

```typescript
import type { User, Role } from "@matrix-sharon/types";

export interface UserStore {
  upsertFromGithub(input: {
    id: string;
    githubId: number;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    /** Role to assign when the user does not yet exist. Existing roles are preserved. */
    defaultRoleIfNew: Role;
  }): Promise<User>;

  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: number): Promise<User | null>;
  list(): Promise<User[]>;
  setRole(id: string, role: Role): Promise<void>;
  touchLastSeen(id: string, at: number): Promise<void>;
}
```

- [ ] **Step 6: Write `packages/ports/src/skill-store.ts`**

```typescript
import type { Skill, SkillVersion } from "@matrix-sharon/types";

export interface SkillStore {
  upsertSkill(skill: Skill): Promise<void>;
  findSkillBySlug(slug: string): Promise<Skill | null>;
  listApproved(): Promise<Array<{ skill: Skill; currentVersion: SkillVersion }>>;

  insertVersion(version: SkillVersion): Promise<void>;
  findVersion(id: string): Promise<SkillVersion | null>;
  listVersionsBySlug(slug: string): Promise<SkillVersion[]>;
  setCurrentVersion(slug: string, versionId: string): Promise<void>;
  /** Largest existing semver for this slug (0 if none). */
  maxSemver(slug: string): Promise<number>;
}
```

- [ ] **Step 7: Write `packages/ports/src/submission-store.ts`**

```typescript
import type { PendingSubmission, SubmissionStatus } from "@matrix-sharon/types";

export interface SubmissionStore {
  insert(submission: PendingSubmission): Promise<void>;
  find(id: string): Promise<PendingSubmission | null>;
  listByStatus(status: SubmissionStatus): Promise<PendingSubmission[]>;
  setStatus(id: string, params: {
    status: Exclude<SubmissionStatus, "pending">;
    reviewerId: string;
    reviewedAt: number;
    rejectReason: string | null;
  }): Promise<void>;
}
```

- [ ] **Step 8: Write `packages/ports/src/candidate-store.ts`**

```typescript
import type { Candidate } from "@matrix-sharon/types";

export interface CandidateStore {
  upsert(candidate: Candidate): Promise<void>;
  listForUser(userId: string, opts?: { includeDismissed?: boolean }): Promise<Candidate[]>;
  find(id: string): Promise<Candidate | null>;
  dismiss(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 9: Write `packages/ports/src/push-store.ts`**

```typescript
import type { Push, PushReceipt, PushReceiptStatus } from "@matrix-sharon/types";

export interface PushStore {
  insertPush(push: Push): Promise<void>;
  insertReceipts(receipts: PushReceipt[]): Promise<void>;
  findPush(id: string): Promise<Push | null>;
  listReceiptsForPush(pushId: string): Promise<PushReceipt[]>;
  listInboxFor(recipientId: string): Promise<Array<{ push: Push; receipt: PushReceipt }>>;
  setReceiptStatus(pushId: string, recipientId: string, params: {
    status: PushReceiptStatus;
    statusChangedAt: number;
    failReason: string | null;
  }): Promise<void>;
  acknowledge(pushId: string, recipientId: string): Promise<void>;
}
```

- [ ] **Step 10: Write `packages/ports/src/install-store.ts`**

```typescript
import type { Install, InstallToken } from "@matrix-sharon/types";

export interface InstallStore {
  recordInstall(install: Install): Promise<void>;
  markUninstalled(userId: string, skillSlug: string, at: number): Promise<void>;
  listForUser(userId: string): Promise<Install[]>;

  putToken(token: InstallToken): Promise<void>;
  consumeToken(token: string, at: number): Promise<InstallToken | null>;
}
```

- [ ] **Step 11: Write `packages/ports/src/bundle-store.ts`**

```typescript
export interface BundleStore {
  /** Save bundle bytes and return sha256. */
  put(slug: string, versionId: string, bytes: Buffer): Promise<{ sha256: string; size: number }>;
  /** Read bundle bytes; throws if not found. */
  get(slug: string, versionId: string): Promise<Buffer>;
  /** Verify on-disk bundle matches expected sha256. */
  verify(slug: string, versionId: string, expectedSha256: string): Promise<boolean>;
}
```

- [ ] **Step 12: Write `packages/ports/src/audit-log.ts`**

```typescript
export interface AuditLog {
  record(entry: {
    actorId: string;
    action: string;
    targetKind: string | null;
    targetId: string | null;
    payload: unknown;
    at: number;
  }): Promise<void>;

  list(filter?: {
    actorId?: string;
    action?: string;
    sinceMs?: number;
    untilMs?: number;
    limit?: number;
  }): Promise<Array<{ id: number; [k: string]: unknown }>>;
}
```

- [ ] **Step 13: Write `packages/ports/src/index.ts`**

```typescript
export * from "./clock.js";
export * from "./id-gen.js";
export * from "./user-store.js";
export * from "./skill-store.js";
export * from "./submission-store.js";
export * from "./candidate-store.js";
export * from "./push-store.js";
export * from "./install-store.js";
export * from "./bundle-store.js";
export * from "./audit-log.js";
```

- [ ] **Step 14: Install + typecheck**

```bash
pnpm install
pnpm --filter @matrix-sharon/ports typecheck
```

Expected: clean.

- [ ] **Step 15: Commit**

```bash
git add packages/ports/ pnpm-lock.yaml
git commit -m "feat(ports): interface definitions for 8 ports + Clock/IdGen"
```

---

### Task 4: packages/core — placeholder skeleton

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Write `packages/core/package.json`**

```json
{
  "name": "@matrix-sharon/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "echo 'core has no logic yet — Phase 4+ adds tests' && exit 0",
    "build": "tsc"
  },
  "dependencies": {
    "@matrix-sharon/types": "workspace:*",
    "@matrix-sharon/ports": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/core/src/index.ts`**

```typescript
/**
 * @matrix-sharon/core — pure business logic (IO-free).
 *
 * Phase 1 placeholder. Real implementations land in:
 *   - Phase 4: frontmatter validation, approval state machine, semver allocation
 *   - Phase 5: candidate diff generation
 *   - Phase 6: PUSH_KINDS dispatch planning
 */
export const CORE_VERSION = "0.0.0" as const;
```

- [ ] **Step 4: Install + typecheck**

```bash
pnpm install
pnpm --filter @matrix-sharon/core typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/ pnpm-lock.yaml
git commit -m "chore(core): empty scaffold (fleshed out in Phase 4+)"
```

---

### Task 5: packages/adapters — Clock + IdGen real implementations

**Files:**
- Create: `packages/adapters/package.json`
- Create: `packages/adapters/tsconfig.json`
- Create: `packages/adapters/src/index.ts`
- Create: `packages/adapters/src/clock-real.ts`
- Create: `packages/adapters/src/id-gen-ulid.ts`
- Create: `packages/adapters/test/clock-real.test.ts`
- Create: `packages/adapters/test/id-gen-ulid.test.ts`

- [ ] **Step 1: Write `packages/adapters/package.json`**

```json
{
  "name": "@matrix-sharon/adapters",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./storage/sqlite": "./src/storage/sqlite/db.ts",
    "./storage/sqlite/migrate": "./src/storage/sqlite/migrate.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc"
  },
  "dependencies": {
    "@matrix-sharon/ports": "workspace:*",
    "@matrix-sharon/types": "workspace:*",
    "better-sqlite3": "^11.3.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Write `packages/adapters/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write the failing test `packages/adapters/test/clock-real.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { RealClock } from "../src/clock-real.js";

describe("RealClock", () => {
  it("now() returns a positive integer in milliseconds", () => {
    const c = new RealClock();
    const t = c.now();
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThan(1_700_000_000_000); // sometime after 2023
  });

  it("monotonic across two calls (within tolerance)", () => {
    const c = new RealClock();
    const a = c.now();
    const b = c.now();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
```

- [ ] **Step 4: Run test, verify fail**

Run: `pnpm --filter @matrix-sharon/adapters test`
Expected: FAIL — `Cannot find module '../src/clock-real.js'`.

- [ ] **Step 5: Implement `packages/adapters/src/clock-real.ts`**

```typescript
import type { Clock } from "@matrix-sharon/ports";

export class RealClock implements Clock {
  now(): number {
    return Date.now();
  }
}
```

- [ ] **Step 6: Run test, verify pass**

Run: `pnpm --filter @matrix-sharon/adapters test`
Expected: 2 tests pass.

- [ ] **Step 7: Write failing test `packages/adapters/test/id-gen-ulid.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { UlidIdGen } from "../src/id-gen-ulid.js";

describe("UlidIdGen", () => {
  it("next() returns a 26-char ULID", () => {
    const g = new UlidIdGen();
    const id = g.next();
    expect(typeof id).toBe("string");
    expect(id).toHaveLength(26);
  });

  it("two calls return distinct ids", () => {
    const g = new UlidIdGen();
    const a = g.next();
    const b = g.next();
    expect(a).not.toBe(b);
  });

  it("monotonically sortable (lexicographic) across calls", () => {
    const g = new UlidIdGen();
    const a = g.next();
    const b = g.next();
    expect(a <= b).toBe(true);
  });
});
```

- [ ] **Step 8: Implement `packages/adapters/src/id-gen-ulid.ts`**

```typescript
import { ulid, monotonicFactory } from "ulid";
import type { IdGen } from "@matrix-sharon/ports";

export class UlidIdGen implements IdGen {
  private readonly mono = monotonicFactory();
  next(): string {
    return this.mono();
  }

  /** Non-monotonic variant for cases where you don't need ordering. */
  nextNonMonotonic(): string {
    return ulid();
  }
}
```

- [ ] **Step 9: Write `packages/adapters/src/index.ts`**

```typescript
export { RealClock } from "./clock-real.js";
export { UlidIdGen } from "./id-gen-ulid.js";
```

- [ ] **Step 10: Run install + tests**

```bash
pnpm install
pnpm --filter @matrix-sharon/adapters test
```

Expected: 5 tests pass.

- [ ] **Step 11: Commit**

```bash
git add packages/adapters/ pnpm-lock.yaml
git commit -m "feat(adapters): RealClock + UlidIdGen with tests"
```

---

### Task 6: SQLite migration file (single source of truth for schema)

**Files:**
- Create: `packages/adapters/src/storage/sqlite/migrations/001_initial.sql`

- [ ] **Step 1: Write `packages/adapters/src/storage/sqlite/migrations/001_initial.sql`**

```sql
-- Migration 001: initial schema for Matrix-Sharon v1
-- Spec: docs/superpowers/specs/2026-05-15-matrix-sharon-design.md §8

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  github_id    INTEGER UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  avatar_url   TEXT,
  role         TEXT NOT NULL CHECK (role IN ('leader','member')),
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE INDEX idx_users_role ON users(role);

CREATE TABLE skills (
  slug               TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  category           TEXT,
  icon               TEXT,
  author_id          TEXT NOT NULL REFERENCES users(id),
  created_at         INTEGER NOT NULL,
  current_version_id TEXT
);

CREATE TABLE skill_versions (
  id            TEXT PRIMARY KEY,
  skill_slug    TEXT NOT NULL REFERENCES skills(slug),
  semver        INTEGER NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  bundle_size   INTEGER NOT NULL,
  description   TEXT NOT NULL,
  pain          TEXT,
  gain          TEXT,
  triggers      TEXT,
  example_json  TEXT,
  readme_md     TEXT NOT NULL,
  note          TEXT,
  published_by  TEXT NOT NULL REFERENCES users(id),
  approved_by   TEXT NOT NULL REFERENCES users(id),
  approved_at   INTEGER NOT NULL,
  published_at  INTEGER NOT NULL,
  UNIQUE(skill_slug, semver)
);

CREATE INDEX idx_skill_versions_slug_semver ON skill_versions(skill_slug, semver);

CREATE TABLE pending_submissions (
  id            TEXT PRIMARY KEY,
  skill_slug    TEXT NOT NULL,
  is_new_skill  INTEGER NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  bundle_size   INTEGER NOT NULL,
  raw_skill_md  TEXT NOT NULL,
  submitter_id  TEXT NOT NULL REFERENCES users(id),
  submitted_at  INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  reviewer_id   TEXT REFERENCES users(id),
  reviewed_at   INTEGER,
  reject_reason TEXT
);

CREATE INDEX idx_pending_status_submitted ON pending_submissions(status, submitted_at);

CREATE TABLE candidates (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  skill_slug      TEXT NOT NULL,
  detected_at     INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  diff_unified    TEXT,
  full_content_md TEXT NOT NULL,
  dismissed       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_candidates_user_dismissed ON candidates(user_id, dismissed);

CREATE TABLE pushes (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  skill_slug        TEXT NOT NULL,
  skill_version_id  TEXT REFERENCES skill_versions(id),
  from_leader_id    TEXT NOT NULL REFERENCES users(id),
  reason            TEXT NOT NULL,
  pushed_at         INTEGER NOT NULL
);

CREATE TABLE push_receipts (
  push_id           TEXT NOT NULL REFERENCES pushes(id),
  recipient_id      TEXT NOT NULL REFERENCES users(id),
  status            TEXT NOT NULL CHECK (status IN ('pending','installed','failed','uninstalled')),
  status_changed_at INTEGER NOT NULL,
  fail_reason       TEXT,
  acknowledged      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (push_id, recipient_id)
);

CREATE INDEX idx_push_receipts_recipient_status ON push_receipts(recipient_id, status);

CREATE TABLE installs (
  user_id          TEXT NOT NULL REFERENCES users(id),
  skill_slug       TEXT NOT NULL,
  skill_version_id TEXT NOT NULL REFERENCES skill_versions(id),
  installed_at     INTEGER NOT NULL,
  uninstalled_at   INTEGER,
  via_push_id      TEXT REFERENCES pushes(id),
  PRIMARY KEY (user_id, skill_slug)
);

CREATE TABLE install_tokens (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  skill_slug  TEXT NOT NULL,
  version_id  TEXT NOT NULL REFERENCES skill_versions(id),
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE TABLE team_config (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  allowed_github_orgs   TEXT,
  allowed_github_teams  TEXT,
  updated_by            TEXT REFERENCES users(id),
  updated_at            INTEGER
);

INSERT INTO team_config (id, allowed_github_orgs, allowed_github_teams) VALUES (1, '[]', '[]');

CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_kind  TEXT,
  target_id    TEXT,
  payload_json TEXT,
  at           INTEGER NOT NULL
);

CREATE INDEX idx_audit_log_at ON audit_log(at);
```

- [ ] **Step 2: Commit** (this file is verified by the next task's runner test)

```bash
git add packages/adapters/src/storage/sqlite/migrations/001_initial.sql
git commit -m "feat(adapters/sqlite): migration 001 initial schema (10 tables)"
```

---

### Task 7: SQLite migration runner

**Files:**
- Create: `packages/adapters/src/storage/sqlite/paths.ts`
- Create: `packages/adapters/src/storage/sqlite/db.ts`
- Create: `packages/adapters/src/storage/sqlite/migrate.ts`
- Create: `packages/adapters/test/storage/sqlite/migrate.test.ts`

- [ ] **Step 1: Write `packages/adapters/src/storage/sqlite/paths.ts`**

```typescript
import { homedir } from "node:os";
import { resolve } from "node:path";

/** Resolve the runtime data directory. Honors SHARON_DATA_DIR env var. */
export function resolveDataDir(): string {
  if (process.env.SHARON_DATA_DIR) return resolve(process.env.SHARON_DATA_DIR);
  return resolve(process.cwd(), "data");
}

export function resolveDbPath(): string {
  return resolve(resolveDataDir(), "sharon.db");
}

export function resolveBundleDir(): string {
  return resolve(resolveDataDir(), "bundles");
}

/** Expand "~" to home directory in a path. */
export function expandHome(p: string): string {
  return p.startsWith("~/") ? resolve(homedir(), p.slice(2)) : p;
}
```

- [ ] **Step 2: Write `packages/adapters/src/storage/sqlite/db.ts`**

```typescript
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDbPath } from "./paths.js";

export interface OpenDbOptions {
  /** Explicit path, otherwise resolves from SHARON_DATA_DIR or ./data/sharon.db */
  path?: string;
  /** Open read-only (for inspection tools). Default false. */
  readonly?: boolean;
}

export function openDb(opts: OpenDbOptions = {}): Database.Database {
  const path = opts.path ?? resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { readonly: opts.readonly ?? false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  return db;
}
```

- [ ] **Step 3: Write failing test `packages/adapters/test/storage/sqlite/migrate.test.ts`**

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-migrate-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("runMigrations", () => {
  it("creates all 10 tables on a fresh database", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations' ORDER BY name"
    ).all() as Array<{ name: string }>;
    expect(tables.map(t => t.name)).toEqual([
      "audit_log",
      "candidates",
      "install_tokens",
      "installs",
      "pending_submissions",
      "push_receipts",
      "pushes",
      "skill_versions",
      "skills",
      "team_config",
      "users",
    ]);
    db.close();
  });

  it("is idempotent — second run is a no-op", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    await runMigrations(db);  // must not throw
    const applied = db.prepare("SELECT count(*) AS n FROM _migrations").get() as { n: number };
    expect(applied.n).toBe(1);
    db.close();
  });

  it("seeds team_config singleton row", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    const row = db.prepare("SELECT * FROM team_config WHERE id = 1").get() as { id: number; allowed_github_orgs: string };
    expect(row).toBeDefined();
    expect(row.id).toBe(1);
    expect(row.allowed_github_orgs).toBe("[]");
    db.close();
  });

  it("enforces foreign keys", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    // try to insert a skill with non-existent author
    expect(() =>
      db.prepare(
        "INSERT INTO skills (slug, name, author_id, created_at) VALUES ('x', 'x', 'ghost', 1)"
      ).run()
    ).toThrow(/FOREIGN KEY/);
    db.close();
  });
});
```

- [ ] **Step 4: Run test, verify fail**

Run: `pnpm --filter @matrix-sharon/adapters test`
Expected: FAIL — `Cannot find module '../../../src/storage/sqlite/migrate.js'`.

- [ ] **Step 5: Implement `packages/adapters/src/storage/sqlite/migrate.ts`**

```typescript
import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: string;
  file: string;
}

/**
 * Discover migrations in src/storage/sqlite/migrations/ at build time.
 * Phase 1 has a single migration. Later phases add files; we keep this list
 * static (vs glob at runtime) so it survives `tsc` to dist.
 */
const MIGRATIONS: Migration[] = [
  { id: "001_initial", file: "migrations/001_initial.sql" },
];

export async function runMigrations(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          TEXT PRIMARY KEY,
      applied_at  INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT id FROM _migrations").all().map((r) => (r as { id: string }).id)
  );

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const sqlPath = resolve(__dirname, m.file);
    const sql = readFileSync(sqlPath, "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
        m.id,
        Date.now()
      );
    });
    tx();
  }
}
```

- [ ] **Step 6: Run test, verify pass**

Run: `pnpm --filter @matrix-sharon/adapters test`
Expected: 4 tests in migrate.test.ts pass; pre-existing 5 tests still pass; total **9 passing**.

- [ ] **Step 7: Commit**

```bash
git add packages/adapters/
git commit -m "feat(adapters/sqlite): migration runner with idempotency + 4 tests"
```

---

### Task 8: packages/server — Fastify hello-world placeholder

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Write `packages/server/package.json`**

```json
{
  "name": "@matrix-sharon/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "bin": { "sharon-server": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "echo 'server has no logic yet — Phase 2+ adds tests' && exit 0",
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@matrix-sharon/adapters": "workspace:*",
    "@matrix-sharon/ports": "workspace:*",
    "@matrix-sharon/types": "workspace:*",
    "fastify": "^5.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/server/src/index.ts`**

```typescript
import Fastify from "fastify";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main() {
  const db = openDb();
  await runMigrations(db);

  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true, ts: Date.now() }));

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Matrix-Sharon server listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Install + typecheck**

```bash
pnpm install
pnpm --filter @matrix-sharon/server typecheck
```

Expected: clean.

- [ ] **Step 5: Smoke check (manual, optional)**

Run (in one terminal): `pnpm --filter @matrix-sharon/server dev`
Visit (or `curl`): `http://127.0.0.1:4321/health`
Expected: `{"ok":true,"ts":...}`
Stop the server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add packages/server/ pnpm-lock.yaml
git commit -m "feat(server): Fastify hello-world + /health + runs migrations on boot"
```

---

### Task 9: packages/web — Astro hello-world placeholder

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/astro.config.mjs`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/src/pages/index.astro`

- [ ] **Step 1: Write `packages/web/package.json`**

```json
{
  "name": "@matrix-sharon/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "astro check",
    "test": "echo 'web has no tests yet — Phase 3+ adds Playwright' && exit 0",
    "build": "astro build",
    "dev": "astro dev"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/web/astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  server: { port: 4322, host: "127.0.0.1" },
  vite: {
    server: { proxy: { "/v1": "http://127.0.0.1:4321" } },
  },
});
```

- [ ] **Step 3: Write `packages/web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 4: Write `packages/web/src/pages/index.astro`**

```astro
---
const title = "Matrix-Sharon · 团队技能集市";
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body style="font-family:-apple-system,'PingFang SC',sans-serif;padding:48px;background:#f7f8fb;color:#1d2433;">
    <h1 style="margin:0 0 8px;">Matrix-Sharon</h1>
    <p style="color:#5c6678;margin:0 0 24px;">团队技能集市 · Phase 1 scaffold</p>
    <p>Web 已就绪。Phase 2 起接入真实页面。可点击的原型见 <code>prototype/index.html</code>。</p>
  </body>
</html>
```

- [ ] **Step 5: Install + typecheck**

```bash
pnpm install
pnpm --filter @matrix-sharon/web typecheck
```

Expected: clean.

- [ ] **Step 6: Smoke check (manual, optional)**

Run: `pnpm --filter @matrix-sharon/web dev`
Open: `http://127.0.0.1:4322/`
Expected: hello-world page renders.
Stop the server.

- [ ] **Step 7: Commit**

```bash
git add packages/web/ pnpm-lock.yaml
git commit -m "feat(web): Astro hello-world + proxy /v1 to server"
```

---

### Task 10: packages/cli — bin entry placeholder

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/bin.ts`

- [ ] **Step 1: Write `packages/cli/package.json`**

```json
{
  "name": "@matrix-sharon/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": { "sharon": "./src/bin.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "echo 'cli has no logic yet — Phase 5+ adds tests' && exit 0",
    "build": "tsc"
  },
  "dependencies": {
    "@matrix-sharon/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/cli/src/bin.ts`**

```typescript
#!/usr/bin/env node

const HELP = `\
sharon — Matrix-Sharon CLI

Usage:
  sharon <command> [args]

Commands (Phase 1: none implemented yet):
  init               Initialize local sharon config (Phase 2)
  login              Sign in via GitHub OAuth (Phase 2)
  publish <dir>      Publish a skill directory (Phase 4)
  install <slug>     Install a skill from Sharon (Phase 5)
  uninstall <slug>   Remove an installed skill (Phase 5)
  scan               Detect local candidate skills (Phase 4)
  --help, -h         Show this help

Phase 1 scaffold only. Run 'sharon --help' anytime.
`;

const arg = process.argv[2];
if (!arg || arg === "--help" || arg === "-h") {
  process.stdout.write(HELP);
  process.exit(0);
}
process.stderr.write(`sharon: unknown command '${arg}'. Run 'sharon --help'.\n`);
process.exit(1);
```

- [ ] **Step 4: Install + typecheck**

```bash
pnpm install
pnpm --filter @matrix-sharon/cli typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/ pnpm-lock.yaml
git commit -m "feat(cli): bin entry + --help placeholder (Phase 1)"
```

---

### Task 11: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm -r typecheck

      - name: Test
        run: pnpm -r test
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: typecheck + test on push/PR to main"
```

- [ ] **Step 3: Push and verify CI runs**

```bash
git push origin main
```

Visit `https://github.com/libz-renlab-ai/Matrix-Sharon/actions` — wait ~2 minutes for the run.
Expected: green checkmark on the latest commit.

If the run fails, the most likely cause is a missing dep or env issue — read the failing step's output, fix locally, commit fix, push.

---

### Task 12: Update repo README — mark Phase 1 done + map Phase 2+

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the "当前状态" section in `README.md`**

Find the existing section (starts with `## 当前状态`) and replace with:

```markdown
## 当前状态

🎯 **Phase 1 scaffold 已完成。** 仓库已是可构建的 pnpm monorepo，CI 绿，DB 迁移可应用。

- ✅ [前端原型](./prototype/index.html) —— 全部主流程的可点击 demo（单 HTML 文件，零依赖）
- ✅ [设计文档](./docs/superpowers/specs/2026-05-15-matrix-sharon-design.md) —— v1 spec
- ✅ [Phase 1 实现计划](./docs/superpowers/plans/2026-05-15-matrix-sharon-phase-1-scaffold.md) —— 已执行完
- ✅ 7 个 package 骨架（types/ports/core/adapters/server/web/cli）
- ✅ SQLite 10 张表初始迁移
- ✅ CI 绿（pnpm typecheck + test）
- ⏳ Phase 2: GitHub OAuth + session（实现计划待写）
- ⏳ Phase 3: 浏览/详情 REST 端点 + Astro 页面接入
- ⏳ Phase 4: 候选 / 提交 / 审批
- ⏳ Phase 5: 安装 + 卸载（CLI + Web 一键）
- ⏳ Phase 6: Leader 推送 + 接收侧 dispatcher

## 开发

```bash
# 一次性
pnpm install

# 全部包：类型检查 + 测试
pnpm typecheck
pnpm test

# 单独跑某一包
pnpm --filter @matrix-sharon/adapters test
pnpm --filter @matrix-sharon/server dev   # 启 server，端口 4321
pnpm --filter @matrix-sharon/web dev      # 启 web，端口 4322（代理 /v1 到 4321）
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: mark Phase 1 done + roadmap for Phase 2-6"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

Verify CI still green.

---

## Phase 1 完成验收

完成上述 12 个 task 后，本地：

```bash
pnpm install          # 干净
pnpm typecheck        # 全绿
pnpm test             # 9 个测试通过：
                      #   - types/push-kinds (4)
                      #   - adapters/clock-real (2)
                      #   - adapters/id-gen-ulid (3 — 注意 .test 是 3 个 case)
                      #   - adapters/storage/sqlite/migrate (4)
                      # 共 4 + 2 + 3 + 4 = 13 个测试用例
git log --oneline     # 至少 12 个新 commit（每个 task 一个）
```

GitHub：CI 绿，main 比 Phase 1 起点至少多 12 commit。

---

## 下一步（不在本 plan，留作下一段）

Phase 2-6 各写独立 plan，每个 plan 产出一段可工作的纵向切片：

| Phase | Plan 文件名（建议） | 产出 |
|-------|-------------------|------|
| 2 | `2026-05-15-matrix-sharon-phase-2-auth.md` | GitHub OAuth → /v1/me 通；web 真登录跳转 |
| 3 | `2026-05-15-matrix-sharon-phase-3-browse.md` | /v1/skills + /v1/skills/:slug；web 浏览/详情可点 |
| 4 | `2026-05-15-matrix-sharon-phase-4-submit-approve.md` | 候选 → submission → 审批 → version 全链路 |
| 5 | `2026-05-15-matrix-sharon-phase-5-install.md` | sharon install + web 一键 + uninstall 联动留存率 |
| 6 | `2026-05-15-matrix-sharon-phase-6-push.md` | leader 推送 + 接收侧 dispatcher + INBOX |

每个 phase 仍走"写 plan → 执行 → 提交"循环。Phase 1 是最大的基础设施一次性工作；2-6 都是增量。
