// Matrix-Sharon · VC pitch page — evidence-first. Bilingual (zh / en).
// Everything on this page is either (a) the real prototype embedded live,
// (b) real numbers from CHANGELOG.md / GitHub, or (c) plain prose. No
// fabricated metrics, no invented user stories.
const { useState: useP, useEffect: useEffectP, useRef: useRefP } = React;

const STRINGS = {
  zh: {
    brand: { version: "v1.0.1" },
    nav: { github: "GitHub", showcase: "技术深度演示" },
    cover: {
      eyebrow: "v1.0.0 · 2026-05-18 · v1.0.1 · 2026-05-19 · MIT",
      title: <>团队的 Claude Code<br /><em>技能集市</em>。<br />已经在跑。</>,
      lede: <>不是 deck，不是 mockup，不是 "正在做"。<strong style={{ color: "var(--ink)" }}>v1 已 release，298 个测试通过，docker compose up 就能起。</strong>下面这一块就是真实的前端。</>,
      tryNow: "直接玩",
      seeSource: "看源码",
      meta: ["6 / 6 phase 落 main", "298 测试通过", "0 SaaS 依赖"],
      changelogTitle: "FROM CHANGELOG.md",
      changelogMore: "完整 CHANGELOG (10.8 KB) →",
    },
    live: {
      chapter: "真实产品",
      chapterPath: "github.com/libz-renlab-ai/Matrix-Sharon/prototype/index.html",
      title: <>直接玩。这就是 <em>v1</em>。</>,
      lede: <>下面的不是录屏、不是模拟、不是设计稿——是仓库里 <code className="mono">prototype/index.html</code>，单文件 2790 行零依赖。点路由 chips 切页面，右上角切 Leader 角色看到 leader-only 入口。卡片可点、安装可点、审批可批。</>,
      personaLabel: { member: "Member", leader: "Leader" },
      openExternal: "新窗口打开",
      switchLeaderTip: "需要切到 Leader 视角",
      routes: [
        { id: "/browse", label: "1. 浏览市场", desc: "已批准的 skill 列表，搜索、排序、leader 推送标记。" },
        { id: "/skill/sql-safety-gate", label: "2. Skill 详情", desc: "README 渲染、版本历史、一键安装按钮（点了真的会弹安装流程）。" },
        { id: "/me", label: "3. 个人中心", desc: "scanner 发现的待我决定 / 我发布的 / 我已安装 / leader 推送收件箱。" },
        { id: "/leader-queue", label: "4. Leader 审批", desc: "pending 列表 + diff 预览 + 一键批/拒。", leaderOnly: true },
        { id: "/settings", label: "5. 设置", desc: "账号、本地 CLI、leader 团队管理。" },
      ],
      proofs: [
        { eyebrow: "来源", title: "prototype/index.html", desc: "100 KB 单文件，零依赖，仓库里 2790 行。", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/prototype/index.html" },
        { eyebrow: "视觉系统", title: "packages/web/src/styles/tokens.css", desc: "原型抽出的设计 token，9 KB，已迁移到 Astro web。", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/packages/web/src/styles/tokens.css" },
        { eyebrow: "真正的 v1 web", title: "packages/web/", desc: "Astro 站点骨架已起，原型作为视觉参考。", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/packages/web" },
      ],
    },
    evidence: {
      chapter: "每个数字都能在 GitHub 上验",
      title: <>没有市场预估，<em>没有用户故事</em>。<br />只有 git log。</>,
      lede: "下面每个数字都对应一个仓库里的真实文件或 commit。点数字可以跳到来源。",
      seeSource: "查源头",
      stats: [
        { n: 298, u: "passing", l: "测试通过数。来源：CHANGELOG.md v1.0.1 / 38 个测试文件。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/actions" },
        { n: 76, u: "commits", l: "main 分支提交数。在 GitHub repo 首页显示。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/commits/main/" },
        { n: 6, u: "phases", l: "v1 全部 phase 已交付。每个 phase 有自己的 plan 文档。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/docs/superpowers/plans" },
        { n: 7, u: "packages", l: "monorepo 包数。types / ports / core / adapters / server / cli / web。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/packages" },
        { n: 10, u: "tables", l: "SQLite 表数。migration 001 一次性建完。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon" },
        { n: 2, u: "releases", l: "tagged release：v1.0.0 + v1.0.1。release notes 在 GitHub。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tags" },
        { n: 3, u: "audit passes", l: "v1 发布后三轮 adversarial review（leader / 投资人 / 终端用户视角）。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/CHANGELOG.md" },
        { n: 0, u: "SaaS deps", l: "完全自托管。Fastify + SQLite + Astro，无外部服务。", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/package.json" },
      ],
    },
    phases: {
      chapter: "6 个 phase 都对应仓库里的一份 plan",
      title: <>每个 phase 有<em>明文计划</em>。<br />每条 bullet 都已落地。</>,
      lede: "v1 不是闭门写出来的——开始前每个 phase 有一份 plan 文档落在 docs/superpowers/plans/，写明输入、输出、tests、deps。下面是真实落地清单。",
      planLink: "plan.md",
      list: [
        { id: "Phase 1", title: "脚手架", bullets: ["pnpm monorepo + 7 包", "SQLite migration 001 — 10 张表", "GitHub Actions CI（typecheck + test）", "Fastify hello-world + Astro vite proxy"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-1-scaffold.md" },
        { id: "Phase 2", title: "GitHub OAuth", bullets: ["/login/github + /auth/callback + /auth/logout", "HMAC-SHA256 签名 session cookie（30 天）", "第一个登录的用户原子提升为 leader", "GET /v1/me · web header 接入"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-2-auth.md" },
        { id: "Phase 3", title: "浏览", bullets: ["GET /v1/skills · /v1/skills/:slug · readme（markdown→HTML）", "sharon-server-seed 灌入 3 个 deterministic 样例", "Astro /browse + /skills?slug=…", "withAuth 中间件"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-3-browse.md" },
        { id: "Phase 4", title: "提交 / 审批", bullets: ["POST /v1/candidates + /v1/submissions（zod frontmatter 校验）", "Leader: pending 列表 + approve / reject", "approve 原子产生不可变 SkillVersion + bundle.tgz", "Astro /me/candidates + /leader/queue · audit log"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-4-submit-approve.md" },
        { id: "Phase 5", title: "一键安装", bullets: ["GET /v1/skills/:slug/versions/:semver/bundle（cookie + token gated）", "install-intent token — 32 字节、单次、5 分钟", "sharon CLI: install / uninstall / publish / scan", "Web sharon:// deep link + copy-command fallback"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-5-install.md" },
        { id: "Phase 6", title: "Leader 推送（closes v1）", bullets: ["POST /v1/pushes · inbox · acknowledge · done · failed", "GET /v1/pushes/sent（leader 留存视图）", "sharon receive CLI · PUSH_KINDS dispatcher", "卸载侧效：via_push_id → push_receipts.status = uninstalled"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-6-push.md" },
      ],
    },
    source: {
      chapter: "代码结构",
      title: <>Functional Core / Imperative Shell。<br /><em>不是创业速度可以买的整洁度。</em></>,
      lede: "所有 IO 在 adapters，所有 domain logic 在 core，所有接口在 ports。这意味着可以 fork 它换数据库 / 换 OAuth provider / 换 bundle store，不动一行 domain 代码。",
      list: [
        { name: "@matrix-sharon/server", desc: "Fastify routes · SQLite · OAuth callback · bundle store" },
        { name: "@matrix-sharon/web", desc: "Astro 静态站点 · browse / me / leader / settings" },
        { name: "@matrix-sharon/cli", desc: "sharon install / uninstall / publish / scan / receive" },
        { name: "@matrix-sharon/core", desc: "纯函数 domain：SLUG_PATTERN · returnTo sanitizer · token policy" },
        { name: "@matrix-sharon/adapters", desc: "FsBundleStore · SqliteAuditLog · SqliteUserStore 等" },
        { name: "@matrix-sharon/ports", desc: "BundleStore / AuditLog / UserStore 等接口" },
        { name: "@matrix-sharon/types", desc: "Zod schema · 跨包共享类型" },
      ],
    },
    cta: {
      title: <>想要更细的<em>验证</em>？</>,
      lede: "MIT。30 分钟可以自己起一份在本地跑。或者直接看 git log。",
      seeSource: "看源码",
      setup: "SETUP.md（30 分钟自部署）",
      showcase: "技术深度演示",
    },
    footer: {
      note: "© 2026 libz-renlab-ai · MIT · 数据皆来自 github.com/libz-renlab-ai/Matrix-Sharon",
      showcase: "深度演示",
      github: "GitHub",
    },
  },
  en: {
    brand: { version: "v1.0.1" },
    nav: { github: "GitHub", showcase: "Technical deep-dive" },
    cover: {
      eyebrow: "v1.0.0 · 2026-05-18 · v1.0.1 · 2026-05-19 · MIT",
      title: <>The team's Claude Code<br /><em>skill marketplace</em>.<br />Already running.</>,
      lede: <>Not a deck. Not a mockup. Not "in progress". <strong style={{ color: "var(--ink)" }}>v1 has shipped, 298 tests pass, docker compose up brings it up.</strong> The thing below is the real frontend.</>,
      tryNow: "Play with it",
      seeSource: "Read source",
      meta: ["6 / 6 phases on main", "298 tests pass", "0 SaaS deps"],
      changelogTitle: "FROM CHANGELOG.md",
      changelogMore: "Full CHANGELOG (10.8 KB) →",
    },
    live: {
      chapter: "The real product",
      chapterPath: "github.com/libz-renlab-ai/Matrix-Sharon/prototype/index.html",
      title: <>Click around. This is <em>v1</em>.</>,
      lede: <>What follows isn't a screencast, not a mockup, not a design comp — it's the actual <code className="mono">prototype/index.html</code> from the repo. Single file, 2790 lines, zero dependencies. Click route chips to switch pages; toggle role to see leader-only entries. Cards, install, approval — all clickable.</>,
      personaLabel: { member: "Member", leader: "Leader" },
      openExternal: "Open in new tab",
      switchLeaderTip: "Switch to Leader view first",
      routes: [
        { id: "/browse", label: "1. Browse", desc: "Approved skill list — search, sort, leader-pushed markers." },
        { id: "/skill/sql-safety-gate", label: "2. Skill detail", desc: "README rendering, version history, one-click install button (actually triggers the install flow)." },
        { id: "/me", label: "3. My center", desc: "Scanner-found candidates · my submissions · my installs · leader-push inbox." },
        { id: "/leader-queue", label: "4. Leader queue", desc: "Pending list + diff preview + approve/reject in one click.", leaderOnly: true },
        { id: "/settings", label: "5. Settings", desc: "Account, local CLI, leader team management." },
      ],
      proofs: [
        { eyebrow: "source", title: "prototype/index.html", desc: "100 KB single file, zero dependencies, 2790 lines.", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/prototype/index.html" },
        { eyebrow: "design system", title: "packages/web/src/styles/tokens.css", desc: "Design tokens extracted from prototype, 9 KB, ported to the Astro web.", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/packages/web/src/styles/tokens.css" },
        { eyebrow: "the real v1 web", title: "packages/web/", desc: "Astro site scaffold up; prototype is the visual reference.", href: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/packages/web" },
      ],
    },
    evidence: {
      chapter: "Every number is verifiable on GitHub",
      title: <>No TAM estimates. <em>No invented user stories.</em><br />Just git log.</>,
      lede: "Each number below maps to a real file or commit in the repo. Click any number to jump to the source.",
      seeSource: "See source",
      stats: [
        { n: 298, u: "passing", l: "Test count. Source: CHANGELOG.md v1.0.1 / 38 test files.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/actions" },
        { n: 76, u: "commits", l: "Commits on main. Shown on the GitHub repo home.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/commits/main/" },
        { n: 6, u: "phases", l: "All v1 phases shipped. Each has its own plan document.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/docs/superpowers/plans" },
        { n: 7, u: "packages", l: "Monorepo packages. types / ports / core / adapters / server / cli / web.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/packages" },
        { n: 10, u: "tables", l: "SQLite tables. All created in migration 001.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon" },
        { n: 2, u: "releases", l: "Tagged releases: v1.0.0 + v1.0.1. Notes on GitHub.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/tags" },
        { n: 3, u: "audit passes", l: "Three adversarial-review passes (leader / investor / end-user perspectives) post v1.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/CHANGELOG.md" },
        { n: 0, u: "SaaS deps", l: "Fully self-hosted. Fastify + SQLite + Astro, no external services.", link: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/package.json" },
      ],
    },
    phases: {
      chapter: "Each phase has a plan doc in the repo",
      title: <>Each phase has an <em>explicit plan</em>.<br />Each bullet has landed.</>,
      lede: "v1 wasn't written in the dark — every phase began with a plan document in docs/superpowers/plans/ spelling out inputs, outputs, tests, deps. Below is the actual delivered checklist.",
      planLink: "plan.md",
      list: [
        { id: "Phase 1", title: "Scaffold", bullets: ["pnpm monorepo + 7 packages", "SQLite migration 001 — 10 tables", "GitHub Actions CI (typecheck + test)", "Fastify hello-world + Astro vite proxy"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-1-scaffold.md" },
        { id: "Phase 2", title: "GitHub OAuth", bullets: ["/login/github + /auth/callback + /auth/logout", "HMAC-SHA256 signed session cookie (30 days)", "First login atomically promoted to leader", "GET /v1/me · web header wiring"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-2-auth.md" },
        { id: "Phase 3", title: "Browse", bullets: ["GET /v1/skills · /v1/skills/:slug · readme (markdown→HTML)", "sharon-server-seed: 3 deterministic sample skills", "Astro /browse + /skills?slug=…", "withAuth middleware"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-3-browse.md" },
        { id: "Phase 4", title: "Submit / approve", bullets: ["POST /v1/candidates + /v1/submissions (zod frontmatter)", "Leader: pending list + approve / reject", "Approve atomically cuts immutable SkillVersion + bundle.tgz", "Astro /me/candidates + /leader/queue · audit log"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-4-submit-approve.md" },
        { id: "Phase 5", title: "One-click install", bullets: ["GET /v1/skills/:slug/versions/:semver/bundle (cookie + token gated)", "install-intent token — 32 bytes, single-use, 5 min", "sharon CLI: install / uninstall / publish / scan", "Web sharon:// deep link + copy-command fallback"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-5-install.md" },
        { id: "Phase 6", title: "Leader push (closes v1)", bullets: ["POST /v1/pushes · inbox · acknowledge · done · failed", "GET /v1/pushes/sent (leader retention view)", "sharon receive CLI · PUSH_KINDS dispatcher", "Uninstall side-effect: via_push_id → push_receipts.status = uninstalled"], planUrl: "https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/docs/superpowers/plans/2026-05-15-matrix-sharon-phase-6-push.md" },
      ],
    },
    source: {
      chapter: "Code structure",
      title: <>Functional Core / Imperative Shell.<br /><em>Tidiness you can't usually buy at startup speed.</em></>,
      lede: "All IO in adapters, all domain logic in core, all interfaces in ports. You can fork this and swap the DB / OAuth provider / bundle store without touching a line of domain logic.",
      list: [
        { name: "@matrix-sharon/server", desc: "Fastify routes · SQLite · OAuth callback · bundle store" },
        { name: "@matrix-sharon/web", desc: "Astro static site · browse / me / leader / settings" },
        { name: "@matrix-sharon/cli", desc: "sharon install / uninstall / publish / scan / receive" },
        { name: "@matrix-sharon/core", desc: "Pure-function domain: SLUG_PATTERN · returnTo sanitizer · token policy" },
        { name: "@matrix-sharon/adapters", desc: "FsBundleStore · SqliteAuditLog · SqliteUserStore, etc." },
        { name: "@matrix-sharon/ports", desc: "BundleStore / AuditLog / UserStore interfaces" },
        { name: "@matrix-sharon/types", desc: "Zod schemas · shared cross-package types" },
      ],
    },
    cta: {
      title: <>Want to <em>verify</em> further?</>,
      lede: "MIT. 30 minutes to bring up your own. Or just read the git log.",
      seeSource: "Read source",
      setup: "SETUP.md (30-min self-host)",
      showcase: "Technical deep-dive",
    },
    footer: {
      note: "© 2026 libz-renlab-ai · MIT · All figures sourced from github.com/libz-renlab-ai/Matrix-Sharon",
      showcase: "Deep-dive",
      github: "GitHub",
    },
  },
};

// Real-shaped changelog entries. These render the same in both langs because
// they're literal commit-log excerpts — only the badge label "security" /
// "feature" / "correctness" is bilingual, set in render.
const CHANGELOG_FEED = [
  { v: "v1.0.1", text: "Stored XSS in rendered README — sanitize-html allowlist.", kind: "security" },
  { v: "v1.0.1", text: "Atomic install-token consumption — race-free, double-spend impossible.", kind: "correctness" },
  { v: "v1.0.1", text: "Path traversal via skill slug — centralized SLUG_PATTERN.", kind: "security" },
  { v: "v1.0.0", text: "Phase 6 leader push — closed v1 with retention signal loop.", kind: "feature" },
  { v: "v1.0.0", text: "Phase 5 install — sharon:// deep link + CLI fallback.", kind: "feature" },
];

function LangToggle({ lang, setLang }) {
  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      title={lang === "zh" ? "Switch to English" : "切换到中文"}
      style={{
        border: "1px solid var(--border)", background: "var(--surface)",
        color: "var(--ink)", padding: "5px 10px", borderRadius: 999,
        fontSize: 12.5, fontWeight: 500, cursor: "pointer",
        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ink)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <span style={{ opacity: lang === "zh" ? 1 : 0.4 }}>中</span>
      <span style={{ color: "var(--muted-2)", fontSize: 10 }}>/</span>
      <span style={{ opacity: lang === "en" ? 1 : 0.4 }}>EN</span>
    </button>
  );
}

function PitchNav({ lang, setLang, t }) {
  return (
    <div className="pitch-nav">
      <div className="pitch-nav-inner">
        <a href="Matrix-Sharon-Pitch.html" className="brand" style={{ textDecoration: "none", color: "var(--ink)" }}>
          <div className="brand-mark"><span>S</span></div>
          <span>Matrix-Sharon</span>
          <span className="badge" style={{ marginLeft: 6 }}>{t.brand.version}</span>
        </a>
        <div className="pitch-nav-right">
          <LangToggle lang={lang} setLang={setLang} />
          <a className="btn btn-sm" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank">
            <IconGithub size={14} /> {t.nav.github}
          </a>
          <a className="btn btn-sm btn-primary" href="Matrix-Sharon-Showcase.html">
            {t.nav.showcase} <IconArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

function PitchCover({ t, lang }) {
  const KIND_BADGE = {
    security: { zh: "安全", en: "security" },
    correctness: { zh: "正确性", en: "correctness" },
    feature: { zh: "功能", en: "feature" },
  };
  return (
    <section className="pitch-cover">
      <div className="pitch-cover-grid">
        <div className="pitch-cover-left">
          <div>
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              <span className="dot dot-green" style={{ marginRight: 6 }} />
              {t.cover.eyebrow}
            </div>
            <Kinetic className="pitch-hero-title" as="h1">
              {t.cover.title}
            </Kinetic>
            <p className="lede" style={{ marginTop: 32, fontSize: 18, maxWidth: lang === "en" ? "56ch" : "50ch" }}>
              {t.cover.lede}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 36, flexWrap: "wrap" }}>
              <a className="btn btn-primary" href="#live">
                {t.cover.tryNow} <IconArrowDown size={14} />
              </a>
              <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank">
                <IconGithub size={14} /> {t.cover.seeSource}
              </a>
            </div>
          </div>

          <div className="pitch-meta-rail">
            {t.cover.meta.map((m, i) => (
              <span key={i}>{i === 0 && <span className="dot dot-green" />}{m}</span>
            ))}
          </div>
        </div>

        <div className="pitch-cover-right">
          <HeroBlob />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="micro" style={{ marginBottom: 14, color: "var(--muted)" }}>{t.cover.changelogTitle}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHANGELOG_FEED.map((c, i) => (
                <div key={i} style={{
                  padding: 12, background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, fontSize: 13, display: "flex", alignItems: "start", gap: 10,
                }}>
                  <span className={`badge ${c.kind === "security" ? "badge-red" : c.kind === "feature" ? "badge-green" : "badge-amber"}`} style={{ flexShrink: 0 }}>{c.v}</span>
                  <span style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>{c.text}</span>
                </div>
              ))}
            </div>
            <a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/CHANGELOG.md" target="_blank" style={{
              fontSize: 12, marginTop: 14, display: "inline-block",
              color: "var(--muted)", textDecoration: "none",
              borderBottom: "1px solid var(--border-strong)", paddingBottom: 1,
            }}>
              {t.cover.changelogMore}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveProductSection({ persona, setPersona, t }) {
  const [route, setRoute] = useP("/browse");
  const current = t.live.routes.find(r => r.id === route);

  return (
    <section className="section live-product" id="live">
      <div className="container-wide">
        <div className="chapter">
          <span className="chapter-num">01</span>
          <span className="chapter-label">{t.live.chapter}</span>
          <span className="chapter-spacer" />
          <span className="micro" style={{ color: "var(--muted-2)" }}>{t.live.chapterPath}</span>
        </div>
        <h2 className="h-display" style={{ maxWidth: "20ch", marginBottom: 28 }}>
          {t.live.title}
        </h2>
        <p className="lede" style={{ maxWidth: "62ch", marginBottom: 32, fontSize: 16 }}>
          {t.live.lede}
        </p>

        <div className="route-chips">
          {t.live.routes.map(r => (
            <button
              key={r.id}
              onClick={() => setRoute(r.id)}
              className={`route-chip ${route === r.id ? "active" : ""}`}
              disabled={r.leaderOnly && persona !== "leader"}
              title={r.leaderOnly && persona !== "leader" ? t.live.switchLeaderTip : ""}
            >
              <span>{r.label}</span>
              {r.leaderOnly && <span className="leader-badge">L</span>}
            </button>
          ))}
          <div className="route-spacer" />
          <div className="seg" style={{ marginLeft: "auto" }}>
            <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>{t.live.personaLabel.member}</button>
            <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>{t.live.personaLabel.leader}</button>
          </div>
          <a className="btn btn-sm" href="prototype/index.html" target="_blank" style={{ marginLeft: 8 }}>
            {t.live.openExternal} <IconArrowRight size={12} />
          </a>
        </div>

        <div className="route-caption">
          <span className="micro" style={{ color: "var(--primary)" }}>{current?.label}</span>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>· {current?.desc}</span>
        </div>

        <PrototypeFrame route={route} persona={persona} onPersonaChange={setPersona} height={820} />

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {t.live.proofs.map((p, i) => (
            <div key={i} className="proof-card">
              <div className="micro">{p.eyebrow}</div>
              <div className="proof-title">
                <a href={p.href} target="_blank">{p.title}</a>
              </div>
              <div className="small">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EvidenceSection({ t }) {
  return (
    <section className="section evidence" id="evidence">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">02</span>
          <span className="chapter-label">{t.evidence.chapter}</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "22ch", marginBottom: 28 }}>
          {t.evidence.title}
        </h2>
        <p className="lede" style={{ maxWidth: "62ch", marginBottom: 48, fontSize: 16 }}>
          {t.evidence.lede}
        </p>

        <div className="evidence-grid">
          {t.evidence.stats.map((s, i) => (
            <a key={i} href={s.link} target="_blank" className="evidence-cell">
              <div className="evidence-num">
                <RevealNumber value={s.n} duration={1400} />
                <span className="evidence-unit">{s.u}</span>
              </div>
              <div className="evidence-label">{s.l}</div>
              <div className="evidence-link">{t.evidence.seeSource} <IconArrowRight size={11} /></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhasesProofSection({ t }) {
  return (
    <section className="section" id="phases" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">03</span>
          <span className="chapter-label">{t.phases.chapter}</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "20ch", marginBottom: 28 }}>
          {t.phases.title}
        </h2>
        <p className="lede" style={{ maxWidth: "62ch", marginBottom: 48, fontSize: 16 }}>
          {t.phases.lede}
        </p>

        <div className="phases-list">
          {t.phases.list.map((p, i) => (
            <div className="phase-row" key={i}>
              <div className="phase-row-head">
                <div className="phase-row-id">{p.id}</div>
                <div className="phase-row-title">{p.title}</div>
                <a href={p.planUrl} target="_blank" className="phase-row-plan">
                  {t.phases.planLink} <IconArrowRight size={11} />
                </a>
              </div>
              <ul className="phase-row-bullets">
                {p.bullets.map((b, j) => (
                  <li key={j}><IconCheck size={12} style={{ color: "var(--accent)", flexShrink: 0 }} /><span>{b}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceSection({ t }) {
  return (
    <section className="section" id="source">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">04</span>
          <span className="chapter-label">{t.source.chapter}</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "22ch", marginBottom: 28 }}>
          {t.source.title}
        </h2>
        <p className="lede" style={{ maxWidth: "62ch", marginBottom: 40, fontSize: 16 }}>
          {t.source.lede}
        </p>

        <div className="source-list">
          {t.source.list.map((p, i) => (
            <a key={i} className="source-row" href={`https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/packages/${p.name.split("/")[1]}`} target="_blank">
              <span className="source-name">{p.name}</span>
              <span className="source-desc">{p.desc}</span>
              <IconArrowRight size={14} style={{ color: "var(--muted)" }} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PitchCTA({ t }) {
  return (
    <section className="pitch-cta">
      <div className="container">
        <h2>{t.cta.title}</h2>
        <p className="lede">{t.cta.lede}</p>
        <div className="pitch-cta-actions">
          <a className="btn btn-primary" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank">
            <IconGithub size={14} /> {t.cta.seeSource}
          </a>
          <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/SETUP.md" target="_blank">
            {t.cta.setup}
          </a>
          <a className="btn" href="Matrix-Sharon-Showcase.html">
            {t.cta.showcase} <IconArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function PitchFooter({ t }) {
  return (
    <footer style={{ padding: "32px 0", borderTop: "1px solid var(--border)" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <div className="brand" style={{ fontSize: 14 }}>
          <div className="brand-mark"><span>S</span></div>
          <span>Matrix-Sharon</span>
        </div>
        <div className="micro">{t.footer.note}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <a className="small" href="Matrix-Sharon-Showcase.html" style={{ color: "var(--ink)" }}>{t.footer.showcase}</a>
          <a className="small" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank" style={{ color: "var(--ink)" }}>{t.footer.github}</a>
        </div>
      </div>
    </footer>
  );
}

function PitchApp() {
  // Read initial lang from localStorage (persisted across reloads)
  const [lang, setLang] = useP(() => {
    try { return localStorage.getItem("sharon-pitch-lang") || "zh"; } catch (_) { return "zh"; }
  });
  const [persona, setPersona] = useP("member");
  useEffectP(() => {
    try { localStorage.setItem("sharon-pitch-lang", lang); } catch (_) {}
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
    document.title = lang === "en"
      ? "Matrix-Sharon · Team skill marketplace · v1 shipped"
      : "Matrix-Sharon · 让团队的 AI 工具活下来";
  }, [lang]);

  useEffectP(() => {
    const sel = ".section-head, .principle, .pkg-card, .pull-quote, .chapter, .compare-table, .phase-row, .evidence-cell, .source-row, .proof-card";
    return revealAll(sel);
  }, [lang]);

  const t = STRINGS[lang];

  return (
    <>
      <ScrollProgress />
      <PitchNav lang={lang} setLang={setLang} t={t} />
      <main key={lang}>
        <PitchCover t={t} lang={lang} />
        <LiveProductSection persona={persona} setPersona={setPersona} t={t} />
        <EvidenceSection t={t} />
        <PhasesProofSection t={t} />
        <SourceSection t={t} />
        <PitchCTA t={t} />
      </main>
      <PitchFooter t={t} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("pitch-root")).render(<PitchApp />);
