# Matrix-Sharon v1 设计

> **状态**: 已对齐决策 + 可点击原型已交付，待 `writing-plans` 出实现计划
> **日期**: 2026-05-15
> **关联**: [`prototype/index.html`](../../../prototype/index.html)（视觉与交互的权威参考） · sibling 仓库 [Matrix-Riven](https://github.com/libz-renlab-ai/Matrix-Riven) [Matrix-Viki](https://github.com/libz-renlab-ai/Matrix-Viki) [Matrix-Plugin-memory](https://github.com/libz-renlab-ai/Matrix-Plugin-memory)
> **拆分来源**: [TeamBrain](https://github.com/libz-renlab-ai/TeamBrain)（复用 `skill-compiler` / `identity` / `config` / hook bin 模式）

---

## 1. 背景与定位

Matrix-Sharon 是给团队用的 **Claude Code skills 共享平台**——团队成员把自己写的 skill 提交进来，leader 审批，全员一键安装。灵感上参考 [skills.vote](https://skills.vote/)，但是 **面向团队** 而不是公共社区，所以有：

- 明确的 **leader / member** 角色与权限
- 上传必走的 **leader 审批门**（过滤掉 AI 生成的低质内容）
- 本地 scanner 自动发现"刚写完的 skill"进入"待我决定"候选列表
- **leader 主动推送** 到指定成员（自动安装、可卸载、留存率作为信号）

Sharon 与 sibling 项目分工清楚：

| 项目 | 职责 | 与 Sharon 关系 |
|------|------|--------------|
| TeamBrain | 完整团队产品 monorepo | Sharon 复用其 `skill-compiler`、hook bin 模板 |
| Matrix-Riven | 用户日志上传子系统 | Sharon 复用其 `identity` / `config` / `paths` |
| Matrix-Viki | 个人 AI 规则学习引擎 | **v1.1+ 集成点**：Sharon 推送 `kind=viki-rule` 包给 Viki 接收处理 |
| Matrix-Plugin-memory | 插件市场雏形 | 未来 Sharon 资源类型扩展时参考 |

---

## 2. v1 范围

### 2.1 在 v1 的子系统

| ID | 子系统 | 说明 |
|----|-------|------|
| S0 | 单仓骨架 | pnpm workspace，types/ports/core/adapters/server/web/cli |
| S1 | 认证与身份 | GitHub OAuth + 可选 GitHub org/team 准入 |
| S2 | 角色模型 | 用户表 + role enum（leader / member），**无 team 实体** |
| S3 | 资源 schema + 存储 | Claude Code 原生 skill（仅 v1） |
| S4 | 浏览 / 详情 / 个人中心 / 审批队列 / 设置 Web UI | Astro + 少量 island |
| S5 | 发布流（候选模式 C） | 本地 scanner → 个人中心"待我决定" → leader 队列 |
| S6 | 审批门 | leader 全部审批，无绕过 |
| S9 | 分发 / 安装 | Web 一键 + 底层本地 sharon CLI/daemon handshake |
| **S11** | **Leader 推送** | leader → 指定成员；auto-install + 软 uninstall + 留存率信号 |

（S11 是范围讨论之后才追加的，原编号体系里没有；为保持一致放在 S10 之前）

### 2.2 不在 v1（deferred to v1.x）

- **S7（投票/评分）** — 原型 UI 里有投票按钮，**仅前端 mock**，v1 不做后端持久化或排行
- **S8（搜索/标签/discovery）** — 搜索框 UI 占位，v1 服务端只做按 slug/名/作者 contains 的简单匹配，无全文索引、无标签云、无 trending 算法
- **S10（社交：评论/关注）** — 完全不做
- **资源类型扩展（plugin / workflow / prompt-template / Viki 规则）** — 数据模型预留 `kind` 字段，UI 显示路线图 disabled pill，v1 仅 `kind=skill` 可用
- **多团队 / 多 org** — 单团队自托是最终形态决策，**永久不做**多租户
- **可绕过审批门** — 决策："全能 leader" 模型不可绕过；不做"高信任成员免审批"等开关

---

## 3. 角色与权限

只有两种用户角色：

### 3.1 leader（"全能 leader"，Curator + Gatekeeper + Owner）

| 能力 | 说明 |
|------|------|
| Curator | pin / featured 推荐资源；修改任何人的资源（罕用，留 escape hatch） |
| Curator | 提升 / 降级成员角色（member ↔ leader） |
| Gatekeeper | 审批 / 拒绝 member 提交的资源（每个版本独立审批） |
| Gatekeeper | leader 自己提交的资源 **也必须** 走审批门（可被其他 leader 批；若只有一个 leader，自我批准但记入审计） |
| Owner | 添加 / 移除成员（限定 GitHub org/team 内） |
| Owner | 查看全部资源（含尚未审批的 pending） |
| Owner | 编辑团队配置（允许登录的 GitHub org/team） |
| **Push** | 推送资源到指定成员，目标自动安装；成员可自行卸载，leader 看到团队留存率 |

### 3.2 member

| 能力 | 说明 |
|------|------|
| 浏览所有 approved 资源 |
| 安装资源到本地 `~/.claude/skills/<name>/` |
| 提交资源（通过候选模式或 `sharon publish`），状态 `pending` 等审批 |
| 投票（v1 UI 占位，不存盘） |
| 卸载任意已安装资源（含 leader 推送的，**带 confirm 提示 + leader 看到 -1 留存信号**） |
| 修改自己的资源（已批准版本不可变；后续修改 = 新版本，重新审批） |

### 3.3 权限实现

服务端是 **唯一可信权威**——所有权限判定在 Fastify 层完成。Web 和 CLI 通过 REST 调用，**永不直接读 SQLite**。

---

## 4. 资源数据模型

### 4.1 Skill（核心实体，v1 唯一资源类型）

Claude Code 原生 skill 格式：

```
sql-safety-gate/                         ← 目录即 slug
├─ SKILL.md                              ← 必需，frontmatter + 正文
└─ scripts/                              ← 可选，附带的脚本/数据
   ├─ check-sql.ts
   └─ dangerous-keywords.json
```

`SKILL.md` frontmatter（v1 必填字段）：

```yaml
---
name: sql-safety-gate              # 同 slug
description: 在 Claude 准备运行任何 SQL 之前拦下来……
# v1 新增的"价值主张三件套"（写在 frontmatter 里，Sharon 解析后呈现）
pain: Claude 半夜要跑 DROP TABLE 时人在睡觉，醒来全员回滚到天亮。
gain: 所有破坏性 SQL 进 PreToolUse hook，强制 EXPLAIN + 行数估算 + 二次确认。
triggers: Claude 准备运行任何含 DROP / TRUNCATE / UPDATE-无-WHERE 的 SQL。
category: safety                   # 决定卡片图标颜色，enum: safety|review|debug|write|perf|test|i18n|git
icon: 🛡️                           # 可选；缺省时按 category 取默认
example:                           # 可选；详情页"来个例子"块
  user: "DROP TABLE users;"
  deny: "❌ 拒绝。这条会影响 23k 行..."
---

# sql-safety-gate
（正文 markdown）
```

**v1 新增的字段（pain/gain/triggers/category/icon/example）** 都是 Sharon 约定的扩展，Claude Code 本身不解析，所以是 **向后兼容** 的 superset。

### 4.2 SkillVersion（不可变）

每次 leader 审批通过 = 一个新的不可变 version：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT (ULID) | 主键 |
| `skill_slug` | TEXT FK | 关联 Skill |
| `semver` | INTEGER | `1`, `2`, `3` ... 每个 `skill_slug` 内自增（无 semver minor/patch；UI 显示时 prefix `v`） |
| `bundle_sha256` | TEXT | bundle .tgz 内容 hash |
| `bundle_size` | INTEGER | 字节数 |
| `published_by` | TEXT FK users.id | 提交者 |
| `approved_by` | TEXT FK users.id | 审批 leader |
| `approved_at` | INTEGER | unix ms |
| `published_at` | INTEGER | unix ms |
| `note` | TEXT | 版本说明 |

bundle 文件存储路径：`data/bundles/<slug>/<version-id>.tgz`，并 sha256 校验。

### 4.3 PendingSubmission（审批队列）

| 字段 | 说明 |
|------|------|
| `id` | ULID |
| `skill_slug` | 关联 skill（可能新 skill） |
| `bundle_sha256` | bundle hash |
| `submitter_id` | 提交者 |
| `submitted_at` | 时间 |
| `next_version` | 如果通过将分配的 semver |
| `status` | `pending` | `approved` | `rejected` |
| `rejected_reason` | 拒绝时填 |
| `reviewer_id` | 审批 / 拒绝 leader |
| `reviewed_at` | 处理时间 |

### 4.4 User

| 字段 | 说明 |
|------|------|
| `id` | GitHub login |
| `github_id` | GitHub numeric ID |
| `name` | display |
| `avatar_url` | from GH |
| `email` | from GH |
| `role` | `leader` \| `member` |
| `created_at` | 首次登录时间 |
| `last_seen_at` | 用于"在线状态" mock |

### 4.5 Vote（v1 UI-only，schema 列出但不实现）

> Out of scope for v1。Schema 草图作为 v1.1 入口预留：
> `(user_id, skill_slug)` 唯一索引，`+1 / 0`，**v1 不存盘**。

---

## 5. PUSH_KINDS 注册表与接收侧 dispatcher

**核心契约：Sharon push 是泛化的"把 bundle 送到接收方"，由接收方本地 dispatcher 按 `kind` 决定怎么落地。**

这是 Sharon ↔ Viki 集成的边界。

### 5.1 Registry（v1 实际形态）

```ts
// packages/types/src/push-kinds.ts
export type PushKindId = "skill" | "viki-rule" | "workflow" | "prompt-template";

export interface PushKindDef {
  id: PushKindId;
  label: string;
  icon: string;
  available: boolean;         // v1 仅 skill=true
  desc: string;
  /** 接收侧 dispatcher 用什么命令/路径落地 */
  handler: PushKindHandler;
}

export type PushKindHandler =
  | { type: "fs-extract"; targetDir: string }     // 解压 bundle 到目录
  | { type: "fs-write-file"; targetPath: string } // 单文件落地
  | { type: "delegate-cli"; cmd: string };        // 调外部 CLI

export const PUSH_KINDS: Record<PushKindId, PushKindDef> = {
  "skill": {
    id: "skill", label: "Skill", icon: "🧩", available: true,
    desc: "Claude Code 原生 skill 目录",
    handler: { type: "fs-extract", targetDir: "~/.claude/skills/{name}/" },
  },
  "viki-rule": {
    id: "viki-rule", label: "Viki 规则", icon: "📐", available: false,
    desc: "Viki 学习引擎抽出的规则包",
    handler: { type: "delegate-cli", cmd: "viki import-rules {bundle}" },
  },
  "workflow": {
    id: "workflow", label: "Workflow", icon: "🔗", available: false,
    desc: "多步 skill 串联的 workflow 定义",
    handler: { type: "fs-extract", targetDir: "~/.claude/workflows/{name}/" },
  },
  "prompt-template": {
    id: "prompt-template", label: "Prompt 模板", icon: "💬", available: false,
    desc: "可重用的 prompt 模板（带参数占位）",
    handler: { type: "fs-write-file", targetPath: "~/.claude/prompts/{name}.md" },
  },
};
```

### 5.2 Push wire 协议

```ts
// Sharon server → 接收方本地 sharon CLI
interface PushEnvelope {
  push_id: string;            // ULID
  kind: PushKindId;
  payload: {
    name: string;             // resource name
    version: string;
    bundle_url: string;       // signed URL，下载 .tgz
    bundle_sha256: string;
  };
  from_leader: {
    user_id: string;
    name: string;
  };
  reason: string;
  pushed_at: number;
}
```

### 5.3 接收侧 dispatcher（在本地 sharon CLI 内）

```ts
// packages/cli/src/dispatcher.ts
async function dispatch(env: PushEnvelope) {
  const def = PUSH_KINDS[env.kind];
  if (!def?.available) throw new Error(`Unsupported kind: ${env.kind}`);

  // 1. 下载 bundle，sha256 校验
  const bundlePath = await downloadAndVerify(env.payload.bundle_url, env.payload.bundle_sha256);

  // 2. 按 handler 类型落地
  switch (def.handler.type) {
    case "fs-extract":
      await extractTgz(bundlePath, expandPath(def.handler.targetDir, env.payload));
      break;
    case "fs-write-file":
      await writeFile(bundlePath, expandPath(def.handler.targetPath, env.payload));
      break;
    case "delegate-cli":
      await execAndWait(def.handler.cmd.replace("{bundle}", bundlePath));
      break;
  }

  // 3. 通知 Sharon server "已安装"，记入 PushReceipt（用于 leader 留存率）
  await markInstalled(env.push_id);
}
```

### 5.4 Viki 集成点

当 Viki 项目接入时，**Sharon 这边不改任何代码**。需要的工作全在另一侧：

1. Viki 项目（matrix-viki）实现 `viki import-rules <bundle-path>` 子命令——接受 `.tgz`，解压后调用其 `core/learning-engine.applyRulePack(rules)`
2. 团队 leader 在 Sharon UI 上选 kind=viki-rule（届时 `available: true`），其他流程不变
3. Sharon 服务端的 `bundle_sha256` 验证、审批门、推送审计、留存率统计——全部和 skill 共享同一套机制

### 5.5 留存率（Push Retention Signal）

`PushReceipt` 表记录每次推送的本地状态：

| 字段 | 值 |
|------|-----|
| `push_id` | FK |
| `recipient_id` | FK users.id |
| `status` | `installed` \| `uninstalled` \| `failed` |
| `status_changed_at` | unix ms |

- 推送时插入一条 `installed`
- 成员调用 `sharon uninstall <slug>` 或 web 卸载 → update 为 `uninstalled`，写新时间戳
- leader 视图聚合：「`sql-safety-gate` v2 推送 10 人 · 保留 8 (80%) · 卸载 2」
- **没有任何挽留机制**：不阻止卸载、不通知 leader、不打扰成员

---

## 6. 主流程

### 6.1 OAuth 登录（S1）

```
浏览器                          Sharon server                   GitHub
   │                                  │                            │
   │ 点 "Sign in with GitHub"          │                            │
   ├─────────────────────────────────►│                            │
   │                                  │ 重定向到 GH OAuth + state    │
   │ ◄────────────────────────────────┤                            │
   │ GET /login/github                                              │
   ├────────────────────────────────────────────────────────────────►│
   │ ◄──────────────────── code + state ────────────────────────────┤
   │ GET /auth/callback?code&state    │                            │
   ├─────────────────────────────────►│                            │
   │                                  │ 用 code 换 access_token      │
   │                                  ├───────────────────────────►│
   │                                  │ ◄────── token ─────────────┤
   │                                  │ GET /user, /user/orgs       │
   │                                  ├───────────────────────────►│
   │                                  │ ◄─ user + org/team membership
   │                                  │                            │
   │                                  │ 1. 校验 user.orgs 包含       │
   │                                  │    允许的 org/team           │
   │                                  │ 2. upsert users 表           │
   │                                  │ 3. 签发 session cookie       │
   │ ◄────── 302 to #/browse ─────────┤                            │
```

session 用 signed cookie（`@fastify/cookie` + secret），TTL 30 天。

### 6.2 候选模式提交（S5）

> 这是 v1 的 **主提交路径**。底层 `sharon publish` 仍然可以直接用，作为内核 primitive。

```
本地 hook (Claude Code Stop event)
   │
   ▼
sharon scan                                Sharon server
   │ 读 ~/.claude/skills/* 当前快照              │
   │ 对比上次快照（~/.sharon/last-scan.json）     │
   │ 找出"新建"或"内容变化 > 20%"的 skill         │
   │                                            │
   ▼                                            │
对每个候选生成本地 diff                          │
   │                                            │
   ▼                                            │
POST /v1/candidates                            │
   { local_user, candidates: [{slug, diff, ─►   │
     full_content, baseline_version }] }       │
                                                │
                                                ▼
                                       存入 candidates 表
                                       通知用户的 web "待我决定"
                                                │
─── 用户进 #/me/candidates 选 "发布候选 →" ────►
                                                │
                                                ▼
                                       从 candidates 取 → 创建
                                       PendingSubmission, status=pending
                                       从 candidates 表删除
                                                │
─── leader 进 #/leader/queue 批准 ────────────►
                                                │
                                                ▼
                                       创建 SkillVersion（不可变）
                                       打包 bundle.tgz + sha256
                                       状态：approved
```

### 6.3 Leader 审批（S6）

- 审批队列按 `submitted_at` 升序
- 一次只能批一个版本（不支持批量）
- 拒绝必须填理由；通过可不填
- 处理后立即从队列消失，更新 PendingSubmission.status
- 通过 = 创建 SkillVersion + 重新打 bundle.tgz；拒绝 = 仅更新状态
- **leader 自己提交的也走同样的队列**——不允许 self-bypass，但如果只有一个 leader 在线，可以自我批准（仍记入审计）

### 6.4 一键安装（S9）

> 决策："Web 一键 + 底层走本地 sharon CLI/daemon"。

```
Web 详情页 "⬇ 一键安装"
   │
   ▼
POST /v1/install-intent { skill_slug, version }
   │
   ▼
server 生成 install_token (单次、5 分钟有效)
   返回 deep link: sharon://install?token=xxx
   │
   ▼
浏览器尝试打开 sharon://...
   │
   ├─► 本地装了 sharon CLI 且注册了 scheme handler
   │       │
   │       ▼
   │   sharon-installer (OS 注册的 handler) 启动
   │       │
   │       ▼
   │   GET /v1/install-tokens/<token> → 拿到 bundle URL + sha256
   │       │
   │       ▼
   │   下载 bundle.tgz → sha256 验证 → 解压到 ~/.claude/skills/<slug>/
   │       │
   │       ▼
   │   POST /v1/install-tokens/<token>/done
   │
   └─► 没装 sharon CLI
        浏览器无法打开 sharon:// → Web 检测超时 → 弹"先装 sharon CLI"指引页

Fallback：CLI 直接 sharon install <slug>@<ver> 不走 web token，直接 GET bundle
```

### 6.5 Leader 推送（S11）

```
leader 详情页 "📤 推送给成员"
   │
   ▼
弹窗：选 kind (v1 锁 skill) + 选成员 + 写理由
   │
   ▼
POST /v1/pushes
  { kind, slug, version, recipients: [...], reason }
   │
   ▼
server：
  1. 校验 caller.role === 'leader'
  2. 为每个 recipient 创建 PushReceipt(status=pending)
  3. 通过 SSE 或长轮询通知接收者的本地 sharon CLI
  4. 返回 push_id
   │
   ▼
每个接收者的本地 sharon CLI 收到事件：
  - 取 PushEnvelope
  - 跑 5.3 dispatcher 流程
  - 成功 → PushReceipt.status = installed
  - 失败 → PushReceipt.status = failed (含错误)
   │
   ▼
推送进入接收者 Web "个人中心 · Leader 推送" inbox
   顶部 banner 提示
   inbox 项含：badge "📌 Leader 推送" + kind tag + reason + "我已了解" + "查看"
   接收者可在 "我已安装" tab 随时卸载 → status → uninstalled

leader 视图（v1.x 加，spec 留位）：
  「我推送的」面板：
    sql-safety-gate v2 · 推送 10 · 保留 8 (80%) · 卸载 2
```

**强制语义已软化**：
- 推送 = 自动安装 + 显著标记 + 留存率信号
- ❌ 不是：不可卸载 / 通知/打扰成员 / 阻塞工作
- 软性约束的好处：保护成员能动性，留存率自然反映团队对该 skill 的认可度

---

## 7. 后端 API 表面（草图）

> 详细 OpenAPI / DTO 在 writing-plans 阶段产出。这里列名字 + 用途。

| Method | Path | 说明 | 谁能用 |
|--------|------|------|--------|
| GET | `/login/github` | 起 OAuth | 公开 |
| GET | `/auth/callback` | OAuth 回调 | 公开 |
| POST | `/auth/logout` | 注销 | 已登录 |
| GET | `/v1/me` | 当前用户信息 | 已登录 |
| GET | `/v1/skills` | 列表，approved | 已登录 |
| GET | `/v1/skills/:slug` | 详情 + 版本列表 | 已登录 |
| GET | `/v1/skills/:slug/versions/:ver/readme` | 渲染好的 readme | 已登录 |
| GET | `/v1/skills/:slug/versions/:ver/bundle` | 下载 bundle.tgz | 已登录或 install-token |
| POST | `/v1/candidates` | 本地 scanner 上报候选 | 本人 |
| GET | `/v1/candidates/mine` | 我的候选 | 本人 |
| DELETE | `/v1/candidates/:id` | 忽略候选 | 本人 |
| POST | `/v1/submissions` | 候选 → 进审批队列 | 本人 |
| GET | `/v1/submissions/pending` | 审批队列 | leader |
| POST | `/v1/submissions/:id/approve` | 批准 → 生成 version + bundle | leader |
| POST | `/v1/submissions/:id/reject` | 拒绝，带理由 | leader |
| POST | `/v1/install-intent` | 起一键安装 token | 已登录 |
| GET | `/v1/install-tokens/:token` | 兑换 token 拿 bundle URL | 持 token |
| POST | `/v1/install-tokens/:token/done` | 标记安装完成 | 持 token |
| POST | `/v1/pushes` | leader 推送给成员 | leader |
| GET | `/v1/pushes/inbox` | 我收到的推送 | 已登录 |
| POST | `/v1/pushes/:id/acknowledge` | "我已了解" | 收件人 |
| POST | `/v1/installs` | 直接 CLI 安装（无 web） | 本人 |
| DELETE | `/v1/installs/:slug` | 卸载（也 update PushReceipt） | 本人 |
| GET | `/v1/users` | 成员列表 | leader |
| POST | `/v1/users/:id/role` | 修改角色 | leader |
| GET | `/v1/team-config` | 团队配置 | leader |
| POST | `/v1/team-config` | 更新允许的 GH org/team | leader |

---

## 8. 数据库 schema 草图

> SQLite (better-sqlite3) + WAL。详细 migrations 在 writing-plans 阶段。

```sql
-- users
CREATE TABLE users (
  id          TEXT PRIMARY KEY,           -- GitHub login
  github_id   INTEGER UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL CHECK (role IN ('leader','member')),
  created_at  INTEGER NOT NULL,
  last_seen_at INTEGER
);

-- skills
CREATE TABLE skills (
  slug         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT,
  icon         TEXT,
  author_id    TEXT NOT NULL REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  current_version_id TEXT      -- FK skill_versions(id), nullable until first approved
);

-- skill_versions (immutable)
CREATE TABLE skill_versions (
  id            TEXT PRIMARY KEY,         -- ULID
  skill_slug    TEXT NOT NULL REFERENCES skills(slug),
  semver        INTEGER NOT NULL,         -- 1, 2, 3... per skill_slug
  bundle_sha256 TEXT NOT NULL,
  bundle_size   INTEGER NOT NULL,
  description   TEXT,
  pain          TEXT,
  gain          TEXT,
  triggers      TEXT,
  example_json  TEXT,
  readme_md     TEXT,                     -- 缓存渲染前的 .md
  note          TEXT,
  published_by  TEXT NOT NULL REFERENCES users(id),
  approved_by   TEXT NOT NULL REFERENCES users(id),
  approved_at   INTEGER NOT NULL,
  published_at  INTEGER NOT NULL,
  UNIQUE(skill_slug, semver)
);

-- pending_submissions
CREATE TABLE pending_submissions (
  id              TEXT PRIMARY KEY,
  skill_slug      TEXT NOT NULL,
  is_new_skill    INTEGER NOT NULL,       -- 1 = first time，0 = new version
  bundle_sha256   TEXT NOT NULL,
  bundle_size     INTEGER NOT NULL,
  raw_skill_md    TEXT NOT NULL,          -- 用来呈现给 leader
  submitter_id    TEXT NOT NULL REFERENCES users(id),
  submitted_at    INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  reviewer_id     TEXT REFERENCES users(id),
  reviewed_at     INTEGER,
  reject_reason   TEXT
);

-- candidates (per-user)
CREATE TABLE candidates (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  skill_slug      TEXT NOT NULL,          -- local slug
  detected_at     INTEGER NOT NULL,
  reason          TEXT NOT NULL,          -- "本地新写" / "你已发布 vX → 本地有 vX+1 改动"
  diff_unified    TEXT,
  full_content_md TEXT NOT NULL,
  dismissed       INTEGER NOT NULL DEFAULT 0
);

-- pushes
CREATE TABLE pushes (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,          -- 'skill' in v1
  skill_slug      TEXT NOT NULL,          -- nullable when kind != skill in v1.x
  skill_version_id TEXT REFERENCES skill_versions(id),
  from_leader_id  TEXT NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,
  pushed_at       INTEGER NOT NULL
);

-- push_receipts
CREATE TABLE push_receipts (
  push_id            TEXT NOT NULL REFERENCES pushes(id),
  recipient_id       TEXT NOT NULL REFERENCES users(id),
  status             TEXT NOT NULL CHECK (status IN ('pending','installed','failed','uninstalled')),
  status_changed_at  INTEGER NOT NULL,
  fail_reason        TEXT,
  acknowledged       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (push_id, recipient_id)
);

-- installs (用于卸载与 push_receipts 联动)
CREATE TABLE installs (
  user_id          TEXT NOT NULL REFERENCES users(id),
  skill_slug       TEXT NOT NULL,
  skill_version_id TEXT NOT NULL REFERENCES skill_versions(id),
  installed_at     INTEGER NOT NULL,
  uninstalled_at   INTEGER,
  via_push_id      TEXT REFERENCES pushes(id),     -- nullable
  PRIMARY KEY (user_id, skill_slug)
);

-- install_tokens (one-shot, 5min TTL)
CREATE TABLE install_tokens (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  skill_slug   TEXT NOT NULL,
  version_id   TEXT NOT NULL REFERENCES skill_versions(id),
  expires_at   INTEGER NOT NULL,
  consumed_at  INTEGER
);

-- team_config (singleton row)
CREATE TABLE team_config (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  allowed_github_orgs   TEXT,               -- JSON array
  allowed_github_teams  TEXT,               -- JSON array
  updated_by            TEXT REFERENCES users(id),
  updated_at            INTEGER
);

-- audit_log
CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,        -- 'approve' | 'reject' | 'push' | 'role-change' | ...
  target_kind  TEXT,                 -- 'skill' | 'user' | 'push' | ...
  target_id    TEXT,
  payload_json TEXT,
  at           INTEGER NOT NULL
);
```

索引（基本）：
- `users.github_id`, `users.role`
- `skill_versions.skill_slug, semver`
- `pending_submissions.status, submitted_at`
- `candidates.user_id, dismissed`
- `push_receipts.recipient_id, status`
- `audit_log.at`

---

## 9. 包结构与依赖方向

```
matrix-sharon/
├─ packages/
│   ├─ types/            纯类型（Skill, Version, User, Push, PushKind, Candidate, AuthState）
│   ├─ ports/            端口接口（SkillStore, UserStore, AuthProvider, BundleStore, AuditLog）
│   ├─ core/             纯函数业务逻辑（IO-free）：
│   │                      - skill frontmatter 校验
│   │                      - 候选 diff 生成
│   │                      - approval 状态机
│   │                      - 版本号分配
│   │                      - PUSH_KINDS dispatch 逻辑（不含 IO，给出动作描述）
│   ├─ adapters/         命令式外壳：
│   │                      - storage/sqlite/*   (better-sqlite3 + WAL + migrations)
│   │                      - auth/github/*      (OAuth code/token 交换)
│   │                      - bundle/fs/*        (data/bundles/<slug>/<ver>.tgz + sha256)
│   │                      - skill-compiler/*   (从 TeamBrain adapters 搬)
│   │                      - identity/config/*  (从 Matrix-Riven shared 搬)
│   ├─ server/           Fastify HTTP：REST API + OAuth 回调 + bundle 下载 + 一键安装握手
│   ├─ web/              Astro：browse / detail / personal-center / leader-queue / settings
│   └─ cli/              sharon CLI + hook bin：
│                          - sharon init / login / publish / install / scan / uninstall
│                          - bin-session-stop（hook 触发 C 模式 scanner）
│                          - 接收侧 dispatcher（处理推送）
├─ data/                  运行时数据（gitignored）
│   ├─ sharon.db          SQLite
│   └─ bundles/<slug>/<version-id>.tgz
├─ prototype/             单文件原型（视觉权威）
└─ docs/
```

依赖方向：

```
   web ──┐
         │ HTTP (REST + SSE)
   cli ──┴──► server ──► adapters ──► core ──► ports ──► types
                                          ▲
                                          │
                                  adapters 实现 ports
```

约束：
- `core` 严格 IO-free（无 fs / net / db / time-now，时间需注入）
- `web` 与 `cli` 永不直接读 sqlite
- `cli` 的接收侧 dispatcher 用 `PUSH_KINDS` registry + handler 模式分发

---

## 10. 视觉与 UI

**视觉的权威来源是 `prototype/index.html`**——不在本文档重复描述像素。需注意：

- 主色靛紫 `#5b5bd6`（primary） + 叶绿 `#00a47c`（success/approved） + 琥珀 `#c67a00`（pending/warning） + 朱红 `#c33d3d`（reject/destructive）
- skill 卡按 `category` 着色（cat-safety / cat-review / ... 共 8 种），图标用 frontmatter 里的 emoji
- 详情页强制展示「好处一目了然」四联块（解决 / 装上后 / 触发 / 示例）
- 角色 gate 用 `body[data-role]` CSS hook（`.leader-only-block`、`.member-only-block`），切角色 0 延迟
- 安装动画固定 4 步：唤起 CLI → 拉 bundle (sha256) → 解压到目标目录 → Claude Code 可用
- push dialog 顶部 kind selector 4 个 pill，仅 skill 激活，其他显示 `v1.x` 角标

实际 Astro 实现时，复刻原型的视觉，**但允许局部增强**（例如 SSR 后第一屏的速度优化、骨架屏、键盘可达性）。

---

## 11. 测试策略

- `core/`: 100% 行覆盖，纯函数表驱动测试（vitest）
- `adapters/`: 契约测试（每个 port 实现都跑同一组契约用例），fixture-driven
- `server/`: 集成测试，用 mock-server 模式（仿 Matrix-Riven），Playwright 跑 OAuth 回调到 install token 整链
- `web/`: 仅冒烟（Playwright），关键 flow：login → browse → detail → install dialog 4 步走完
- `cli/`: 单元 + 端到端（用 mock-server）；接收侧 dispatcher 必须 cover 所有 `available: true` 的 kind

CI（GitHub Actions）：
- typecheck（tsc --noEmit）
- vitest（全部 packages）
- skill bundle round-trip 烟测（compile 一个固定 skill，校验 sha256 稳定）

---

## 12. v1 不做（deferred）

每条都已在第 2 节列出，这里给 writing-plans 一个集中清单，**不要把它们规划进 v1 实现计划**：

| 项 | 原因 | 何时考虑 |
|----|------|---------|
| 投票 / 评分 持久化 | 原型 UI 占位，无 schema 持久化 | v1.1 |
| 全文搜索 / 标签 / trending | 简单 LIKE 已够单团队几十个 skill | v1.2，超过 100 skill 时 |
| 评论 / 关注 / 通知 | 社交层，本质偏离 "团队工具" | v2 |
| `kind=viki-rule` 等其他资源 | 留好 registry 接口，等 Viki 项目对接 | v1.1 起 |
| 多团队 / 多 org / 联邦 | 决策永久不做（如果业务变化再开） | — |
| Web 直接拖拽上传 / Git URL 拉取 | CLI publish + 候选模式覆盖 99% 用例 | v1.x，如果有强需求 |
| 推送撤回 / 强制更新 | 软推送 + 留存率信号 已足够；不做硬撤回 | 暂不考虑 |
| 自我审批的二级 leader 审计追踪 | 单 leader 场景接受自我批准 + 审计 | 多 leader 后期再约束 |
| 离线 / 断网工作 | sharon CLI 需要 server 才能跑 | 不做 |
| Windows scheme handler 注册细节 | v1 Mac/Linux 跑通即可 | v1.0 后补 |

---

## 13. 已对齐的 11 项核心决策（速查）

| # | 维度 | 决策 |
|---|-----|------|
| 1 | 部署形态 | 单团队自托（公司内部一份） |
| 2 | 团队结构 | 不划队，只有用户 + 角色 |
| 3 | 角色 | leader（全能 Curator+Gatekeeper+Owner）+ member |
| 4 | 资源类型 v1 | Claude Code 原生 skill |
| 5 | 认证 | GitHub OAuth（可选限定 org/team） |
| 6 | 安装路径 | Web 一键（底层走本地 sharon CLI/daemon） |
| 7 | 提交路径 | 个人中心"待我决定"候选模式（底层 `sharon publish`） |
| 8 | 版本模型 | 每次审批通过自动生不可变版本，`latest` + pin 都支持 |
| 9 | 审批 | 上传 → `pending`，leader 必须批 |
| 10 | 推送语义 | **soft：自动安装 + 软标记 + 留存率信号，成员可自行卸载** |
| 11 | 技术栈 | pnpm monorepo · Fastify + SQLite · Astro · 复用 TeamBrain `skill-compiler` |

---

**下一步**: 进入 `superpowers:writing-plans` 阶段，把本 spec 转成可执行的实现计划。
