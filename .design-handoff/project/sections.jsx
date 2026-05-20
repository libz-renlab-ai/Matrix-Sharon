// All section components for Matrix-Sharon showcase
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS, useMemo: useMemoS } = React;
const SHARON_DATA = window.SHARON_DATA_ZH;

/* ---------------- HERO ---------------- */
function HeroSection({ persona }) {
  return (
    <section className="section" id="overview" style={{ paddingTop: 96, paddingBottom: 96 }}>
      <div className="container-wide">
        <div className="grid-feature">
          <div>
            <div className="eyebrow">Matrix-Sharon · v1 已上线</div>
            <Kinetic className="h-display" style={{ marginBottom: 28 }}>
              {<>团队的<em>技能集市</em>。<br />过滤 AI slop，<br />沉淀真正用得起来的 skill。</>}
            </Kinetic>
            <p className="lede" style={{ fontSize: 17 }}>
              一个给团队用的 Claude Code skills / plugins / workflows 共享平台。
              本地 scanner 自动发现你"刚写完的 skill"，走 leader 审批门，一键安装到 <code className="mono" style={{ background: "var(--bg-sunk)", padding: "1px 6px", borderRadius: 4, fontSize: 14 }}>~/.claude/skills/</code>。
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => document.getElementById("problem").scrollIntoView({ behavior: "smooth", block: "start" })}>
                开始演示 <IconArrowDown size={14} />
              </button>
              <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank">
                <IconGithub size={14} /> 在 GitHub 查看
              </a>
            </div>
          </div>

          <HeroCanvas persona={persona} />
        </div>

        <Reveal stagger style={{ marginTop: 80, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, paddingTop: 32, borderTop: "1px solid var(--border)" }}>
          {[
            ["6", "phase 全数落 main"],
            ["7", "monorepo 包"],
            ["10", "SQLite 表"],
            ["0", "SaaS 依赖"],
          ].map(([n, l], i) => (
            <div key={i}>
              <div className="stat-big" style={{ fontSize: 56 }}><RevealNumber value={parseInt(n)} duration={1200} /></div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function HeroCanvas({ persona }) {
  // animated flow viz: candidate → leader → install
  const [tick, setTick] = useStateS(0);
  useEffectS(() => {
    const id = setInterval(() => setTick(t => t + 1), 2200);
    return () => clearInterval(id);
  }, []);
  const stages = ["candidate", "pending", "approved", "installing", "running"];
  const stageIdx = tick % stages.length;

  return (
    <div className="hero-canvas" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <HeroBlob />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div className="micro">team.local — sharon dashboard</div>
        <div className="micro">{persona === "leader" ? "● leader view" : "● member view"}</div>
      </div>

      {/* simulated app card */}
      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar handle="@viki" />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>K8s Pod Inspector</div>
              <div className="small" style={{ fontSize: 12 }}>@viki · 刚刚提交</div>
            </div>
          </div>
          <span className={`badge ${
            stageIdx === 0 ? "badge-amber" :
            stageIdx === 1 ? "badge-amber" :
            stageIdx >= 2 ? "badge-green" : ""
          }`}>
            {stageIdx <= 1 ? "pending" : stageIdx === 2 ? "approved" : stageIdx === 3 ? "installing" : "running"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "本地 scanner 发现", at: 0 },
            { label: "leader 收到审批", at: 1 },
            { label: "通过 → 不可变版本 v1.0.0", at: 2 },
            { label: "团队 23/28 一键安装", at: 3 },
            { label: "留存信号 91% 回流", at: 4 },
          ].map((step, i) => {
            const done = i <= stageIdx;
            const active = i === stageIdx;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 13,
                color: done ? "var(--ink)" : "var(--muted-2)",
                opacity: active ? 1 : (done ? 0.85 : 0.5),
                transition: "all 0.4s ease",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `1.5px solid ${done ? "var(--rose)" : "var(--border-strong)"}`,
                  background: done ? "var(--rose)" : "transparent",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  transition: "all 0.4s ease",
                }}>
                  {done && <IconCheck size={10} stroke="white" />}
                </div>
                <span>{step.label}</span>
                {active && <span className="micro" style={{ marginLeft: "auto", color: "var(--rose)" }}>active</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="caption" style={{ marginTop: 0, position: "relative", zIndex: 1 }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <IconBolt size={16} />
        </div>
        <div>
          <strong>每个 skill 都有一条完整的生命周期</strong>
          —— 从本地草稿到团队级生效，全部留下可追溯的不可变记录。
        </div>
      </div>
    </div>
  );
}

/* ---------------- PHASES RAIL ---------------- */
function PhasesSection() {
  const [active, setActive] = useStateS(0);
  const phase = SHARON_DATA.phases[active];
  return (
    <section className="section section-narrow" id="phases">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">v1 已对齐 · 全部 落 main</div>
          <h2 className="h2">6 个 phase 把整条链路跑通。</h2>
          <p className="lede">没有"半成品 v1" —— 登录、浏览、提交、审批、安装、推送、留存信号，每一步都已经在 CI 上跑过。</p>
        </div>

        <div className="phase-rail">
          {SHARON_DATA.phases.map((p, i) => (
            <div key={p.id} className={`phase-cell ${i === active ? "active" : ""}`} onClick={() => setActive(i)}>
              <div className="phase-num">P{p.id}</div>
              <div className="phase-name">{p.name}</div>
              <div className="phase-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- AUTH ---------------- */
function AuthSection() {
  const [step, setStep] = useStateS(0);
  // 0 = idle, 1 = github redirect, 2 = callback, 3 = logged in (leader)
  useEffectS(() => {
    if (step === 1) { const id = setTimeout(() => setStep(2), 900); return () => clearTimeout(id); }
    if (step === 2) { const id = setTimeout(() => setStep(3), 700); return () => clearTimeout(id); }
  }, [step]);

  return (
    <section className="section" id="auth">
      <div className="container">
        <div className="grid-feature">
          <div>
            <div className="eyebrow">Phase 2 · GitHub OAuth</div>
            <h2 className="h2">没有自家账号体系。<br />用 GitHub。</h2>
            <p className="lede">
              <code className="mono">/login/github</code> → 回调 → 签名 session cookie。
              <strong style={{ color: "var(--ink)" }}> 第一个登录的用户自动成为 leader</strong>，避免冷启动空中楼阁。
            </p>
            <ul style={{ paddingLeft: 0, listStyle: "none", marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["签名 session cookie", "HMAC-SHA256，不依赖外部 session 存储"],
                ["第一个登录者 = leader", "无需手动写死管理员，零配置启动"],
                ["leader 可以转让 / 增设", "v1 内置 RBAC，未来扩展更多角色"],
              ].map(([t, d], i) => (
                <li key={i} style={{ display: "flex", gap: 12, alignItems: "start" }}>
                  <div style={{ marginTop: 3 }}><IconShield size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{t}</div>
                    <div className="small">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* mock browser */}
            <div style={{ background: "var(--bg-sunk)", padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg-elev)", padding: "3px 10px", borderRadius: 4, border: "1px solid var(--border)", flex: 1 }}>
                {step === 1 ? "github.com/login/oauth/authorize" : step === 2 ? "sharon.team.local/auth/callback?code=…" : "sharon.team.local"}
              </div>
            </div>
            <div style={{ padding: 36, minHeight: 320, display: "grid", placeItems: "center" }}>
              {step === 0 && (
                <div style={{ textAlign: "center", maxWidth: 280 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
                    <IconGithub size={24} />
                  </div>
                  <h3 className="h3" style={{ marginBottom: 8 }}>登录 Sharon</h3>
                  <p className="small" style={{ marginBottom: 20 }}>用 GitHub 账号登录团队的技能集市</p>
                  <button className="btn btn-primary" onClick={() => setStep(1)} style={{ width: "100%", justifyContent: "center" }}>
                    <IconGithub size={14} /> 使用 GitHub 登录
                  </button>
                  <div className="micro" style={{ marginTop: 16 }}>首位登录者将自动成为 leader</div>
                </div>
              )}
              {step === 1 && (
                <div style={{ textAlign: "center" }}>
                  <div className="loader" style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "2px solid var(--border)",
                    borderTopColor: "var(--rose)",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }} />
                  <div className="small">跳转到 GitHub authorize…</div>
                </div>
              )}
              {step === 2 && (
                <div style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                    <div>→ /auth/callback</div>
                    <div>→ verify code with GitHub ✓</div>
                    <div>→ fetch user · @sharon</div>
                    <div>→ 检查 users 表… 空</div>
                    <div style={{ color: "var(--rose)" }}>→ INSERT user(role=leader) ✓</div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div style={{ textAlign: "center" }}>
                  <Avatar handle="@sharon" role="leader" size={56} />
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 14 }}>@sharon</div>
                  <div style={{ display: "inline-flex", marginTop: 6 }}>
                    <span className="badge badge-blue"><span className="dot dot-blue" />leader</span>
                  </div>
                  <div className="small" style={{ marginTop: 16 }}>欢迎建立你的团队技能集市。</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setStep(0)}>重置演示</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

/* ---------------- BROWSE ---------------- */
function BrowseSection() {
  const [q, setQ] = useStateS("");
  const [cat, setCat] = useStateS("全部");
  const [selected, setSelected] = useStateS(SHARON_DATA.skills[0].slug);
  const cats = ["全部", "Database", "Workflow", "Observability", "Writing"];
  const filtered = SHARON_DATA.skills.filter(s => {
    if (cat !== "全部" && s.category !== cat) return false;
    if (q && !(s.name + s.summary + s.tags.join(" ")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const cur = SHARON_DATA.skills.find(s => s.slug === selected);

  return (
    <section className="section" id="browse">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 3 · 浏览市场</div>
          <h2 className="h2">先看团队已经选出来的好东西。</h2>
          <p className="lede">市场首页是已批准的 skill —— 不是 ChatGPT 跟你扯的"100 个最佳实践"，而是同事用过、leader 拍板、不可变版本号的东西。</p>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", display: "flex", gap: 12, borderBottom: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconSearch size={14} /></div>
              <input
                type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="搜索 skill、标签、作者…"
                style={{
                  width: "100%", padding: "7px 12px 7px 32px",
                  border: "1px solid var(--border)", borderRadius: 8,
                  background: "var(--bg)", color: "var(--ink)",
                  fontFamily: "inherit", fontSize: 13.5, outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
            <div className="seg">
              {cats.map(c => (
                <button key={c} className={cat === c ? "active" : ""} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", minHeight: 480 }}>
            <div style={{ borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 10, overflow: "auto", maxHeight: 600 }}>
              {filtered.length === 0 && <div className="small" style={{ padding: 20, textAlign: "center" }}>没有匹配项。</div>}
              {filtered.map(s => (
                <div key={s.slug} className={`skill-card ${selected === s.slug ? "selected" : ""}`} onClick={() => setSelected(s.slug)}>
                  <div className="skill-head">
                    <div>
                      <div className="skill-title">{s.name}</div>
                      <div className="small" style={{ fontSize: 12, marginTop: 2 }}>{s.author} · {s.authorRole}</div>
                    </div>
                    <span className="badge">v{s.version}</span>
                  </div>
                  <div className="skill-summary">{s.summary}</div>
                  <div className="skill-meta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconDownload size={12} /> {s.installs}/{s.teamSize} 已安装
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconStar size={12} /> {s.stars}
                    </span>
                    {s.pushedBy === "leader" && <span className="badge badge-blue" style={{ marginLeft: "auto" }}>leader 推送</span>}
                  </div>
                </div>
              ))}
            </div>
            <SkillDetail skill={cur} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SkillDetail({ skill }) {
  const [tab, setTab] = useStateS("README");
  const [installing, setInstalling] = useStateS(null);

  useEffectS(() => { setInstalling(null); setTab("README"); }, [skill?.slug]);

  if (!skill) return <div style={{ padding: 24 }} className="small">选一个 skill 看详情</div>;

  return (
    <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div>
            <h3 className="h3" style={{ fontSize: 22, marginBottom: 4 }}>{skill.name}</h3>
            <div className="small">
              <code className="mono">{skill.slug}</code> · v{skill.version} · 更新于 {skill.updated}
            </div>
          </div>
          <button
            className={`btn ${installing === "done" ? "" : "btn-primary"}`}
            onClick={() => {
              if (installing) return;
              setInstalling("web");
              setTimeout(() => setInstalling("done"), 1400);
            }}
          >
            {installing === "web" && <span>安装中…</span>}
            {installing === "done" && <><IconCheck size={14} /> 已安装</>}
            {!installing && <><IconDownload size={14} /> 一键安装</>}
          </button>
        </div>
      </div>

      <div className="demo-tabs">
        {["README", "权限", "版本"].map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "README" && (
        <div>
          <p style={{ marginTop: 0, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>{skill.summary}</p>
          <div className="small" style={{ marginTop: 10, marginBottom: 6, color: "var(--ink)" }}>工作方式</div>
          <ol style={{ paddingLeft: 18, margin: 0, color: "var(--muted)", fontSize: 13.5 }}>
            {skill.bodySteps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ol>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {skill.tags.map(t => <span key={t} className="badge">#{t}</span>)}
          </div>
        </div>
      )}
      {tab === "权限" && (
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
          <div className="small" style={{ marginBottom: 8, color: "var(--ink)" }}>声明的权限范围</div>
          {[
            ["读取本地代码", true],
            ["执行 shell 命令", skill.category === "Database"],
            ["网络访问", false],
            ["写入 ~/.claude", true],
          ].map(([p, on], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
              <span>{p}</span>
              <span className={`badge ${on ? "badge-amber" : ""}`}>{on ? "需要" : "无"}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "版本" && (
        <div style={{ fontSize: 13 }}>
          {[
            { v: skill.version, at: skill.updated, by: skill.author, latest: true, note: "patch: 更细的错误信息" },
            { v: "1.3.0", at: "上周", by: skill.author, note: "feat: 增加 dry-run 模式" },
            { v: "1.2.0", at: "上月", by: skill.author, note: "首次发布" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px dashed var(--border)" }}>
              <div style={{ width: 70 }}>
                <span className="mono" style={{ fontSize: 13 }}>v{r.v}</span>
                {r.latest && <span className="badge badge-rose" style={{ marginLeft: 6 }}>latest</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--ink)" }}>{r.note}</div>
                <div className="small" style={{ fontSize: 12 }}>{r.by} · {r.at}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "auto" }}>
        <div className="caption">
          <IconShield size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div><strong>每一次"批准"都会冻结成不可变版本。</strong> 你装的是 v{skill.version}，不是漂移的 latest。</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CANDIDATE / SUBMIT ---------------- */
function SubmitSection() {
  const [candidates, setCandidates] = useStateS(SHARON_DATA.candidates);
  const [submitting, setSubmitting] = useStateS(null);

  const handleSubmit = (id) => {
    setSubmitting(id);
    setTimeout(() => {
      setCandidates(prev => prev.filter(c => c.id !== id));
      setSubmitting(null);
    }, 1200);
  };
  const handleDismiss = (id) => setCandidates(prev => prev.filter(c => c.id !== id));

  return (
    <section className="section" id="submit">
      <div className="container">
        <div className="grid-feature">
          <div>
            <div className="eyebrow">Phase 4 · 提交 · scanner 模式</div>
            <h2 className="h2">不强迫"先想清楚再写"。<br />写完了，scanner 才问你要不要交。</h2>
            <p className="lede">
              本地 daemon 扫描 <code className="mono" style={{ background: "var(--bg-sunk)", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>~/.claude/skills/local/</code>，
              看到刚改完的文件就把它丢进个人中心的"待我决定"——
              <strong style={{ color: "var(--ink)" }}>不是后台偷偷上传，是给你选择。</strong>
            </p>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["scanner 不上传内容", "只发文件名 + 时间戳，正文要你主动按『提交』才走"],
                ["本地草稿可以无限改", "在你按下『提交』之前，没有任何东西离开机器"],
                ["有 README 才能提交", "缺 skill.yaml 或 README 直接在本地拦住"],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{ marginTop: 1, color: "var(--primary)" }}><IconCheck size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{t}</div>
                    <div className="small">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>个人中心 · 待我决定</div>
                <div className="small" style={{ fontSize: 12 }}>scanner 本地发现的 skill</div>
              </div>
              <span className="badge badge-rose"><span className="dot dot-rose" />{candidates.length} 待决定</span>
            </div>
            <div>
              {candidates.length === 0 && (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div className="small">队列空了。</div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => setCandidates(SHARON_DATA.candidates)}>重置演示</button>
                </div>
              )}
              {candidates.map(c => (
                <div key={c.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="small" style={{ fontSize: 12, marginTop: 2 }}><span className="dot dot-amber" /> {c.detectedAt}</div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.path}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDismiss(c.id)}>忽略</button>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={submitting === c.id}
                        onClick={() => handleSubmit(c.id)}
                      >
                        {submitting === c.id ? "上传中…" : <><IconUpload size={12} /> 提交</>}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)" }}>{c.summary}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                    <span><IconFile size={11} /> {c.lines} 行</span>
                    <span>
                      {c.hasTests ? <span style={{ color: "var(--accent)" }}>✓ 含测试</span> : <span style={{ color: "var(--warning)" }}>⚠ 无测试</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- LEADER APPROVAL ---------------- */
function ApprovalSection({ persona, setPersona }) {
  const [queue, setQueue] = useStateS(SHARON_DATA.pendingApproval);
  const [activeId, setActiveId] = useStateS(SHARON_DATA.pendingApproval[0]?.id);
  const [toast, setToast] = useStateS(null);
  const active = queue.find(q => q.id === activeId) || queue[0];

  const decide = (verdict) => {
    if (!active) return;
    setToast({ name: active.name, verdict });
    setQueue(q => {
      const remaining = q.filter(item => item.id !== active.id);
      if (remaining.length > 0) setActiveId(remaining[0].id);
      return remaining;
    });
    setTimeout(() => setToast(null), 2200);
  };
  const reset = () => {
    setQueue(SHARON_DATA.pendingApproval);
    setActiveId(SHARON_DATA.pendingApproval[0].id);
  };

  return (
    <section className="section" id="approval" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="eyebrow">Phase 4 · Leader 审批门</div>
            <h2 className="h2">Leader 是质量门，不是看板管理员。</h2>
            <p className="lede">每一条提交都打包成 diff、附带静态检查，让 leader 在 30 秒内能拍板。批准 → 立即生成不可变 SkillVersion + bundle.tgz。</p>
          </div>
          {persona !== "leader" && (
            <button className="btn btn-primary" onClick={() => setPersona("leader")}>切换到 leader 视角 <IconArrowRight size={14} /></button>
          )}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar handle="@sharon" role="leader" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Leader 审批队列</div>
                <div className="small" style={{ fontSize: 12 }}>@sharon 视角</div>
              </div>
            </div>
            <div className="micro">{queue.length} pending</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 460 }}>
            <div style={{ borderRight: "1px solid var(--border)" }}>
              {queue.length === 0 && (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <IconCheck size={18} />
                  </div>
                  <div style={{ fontWeight: 500 }}>队列清空</div>
                  <div className="small" style={{ marginTop: 4 }}>团队的 skill 标准由你定义。</div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 14 }} onClick={reset}>重置演示</button>
                </div>
              )}
              {queue.map(q => (
                <div
                  key={q.id}
                  onClick={() => setActiveId(q.id)}
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: active?.id === q.id ? "var(--bg-sunk)" : "transparent",
                    borderLeft: active?.id === q.id ? "2px solid var(--primary)" : "2px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{q.name}</div>
                      <div className="small" style={{ fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar handle={q.author} size={16} />
                        {q.author} · {q.submittedAt}
                      </div>
                    </div>
                    <span className="badge badge-amber"><span className="dot dot-amber" />pending</span>
                  </div>
                </div>
              ))}
            </div>

            {active && (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <h3 className="h3" style={{ fontSize: 20 }}>{active.name}</h3>
                  <div className="small">{active.author} · {active.authorRole} · 提交于 {active.submittedAt}</div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{active.summary}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8 }}>
                    <div className="micro">diff</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      <span style={{ color: "var(--accent)" }}>+{active.diffStats.added}</span>{" "}
                      <span style={{ color: "var(--danger)" }}>-{active.diffStats.removed}</span>
                    </div>
                  </div>
                  <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8 }}>
                    <div className="micro">checks</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>{active.checks.filter(c => c.ok).length}/{active.checks.length} 通过</div>
                  </div>
                </div>
                <div>
                  <div className="micro" style={{ marginBottom: 8 }}>静态检查</div>
                  {active.checks.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border)", fontSize: 13.5 }}>
                      {c.ok ? <span style={{ color: "var(--accent)" }}><IconCheck size={14} /></span> : <span style={{ color: "var(--danger)" }}><IconX size={14} /></span>}
                      <span style={{ color: c.ok ? "var(--ink)" : "var(--danger)" }}>{c.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
                  <button className="btn btn-danger" onClick={() => decide("reject")}><IconX size={14} /> 驳回 + 留言</button>
                  <button className="btn btn-ghost btn-sm">查看完整 README</button>
                  <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => decide("approve")}>
                    <IconCheck size={14} /> 批准 → 生成 v1.0.0
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "var(--ink)", color: "var(--bg)",
            padding: "10px 18px", borderRadius: 999, fontSize: 13,
            boxShadow: "var(--shadow-lg)", zIndex: 100,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {toast.verdict === "approve"
              ? <><span style={{ color: "var(--accent)" }}><IconCheck size={14} /></span> {toast.name} 已批准 · 生成 v1.0.0 + bundle.tgz</>
              : <><span style={{ color: "var(--danger)" }}><IconX size={14} /></span> {toast.name} 已驳回</>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- INSTALL ---------------- */
function InstallSection() {
  const [mode, setMode] = useStateS("web");
  const [progress, setProgress] = useStateS(0);
  const [installed, setInstalled] = useStateS(false);
  const tickRef = useRefS();

  useEffectS(() => {
    setProgress(0); setInstalled(false);
    clearInterval(tickRef.current);
  }, [mode]);

  const startInstall = () => {
    if (progress > 0 && progress < 100) return;
    setProgress(0); setInstalled(false);
    let p = 0;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(tickRef.current);
        setProgress(100);
        setTimeout(() => setInstalled(true), 200);
      } else { setProgress(p); }
    }, 220);
  };
  const reset = () => { setProgress(0); setInstalled(false); };

  return (
    <section className="section" id="install">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 5 · 一键安装</div>
          <h2 className="h2">Web 上点一下，本地 daemon 就动了。</h2>
          <p className="lede"><code className="mono">sharon://</code> URL scheme 让浏览器跟本地 CLI 握手；没装 daemon 也不慌，会自动 fallback 到可复制的命令。</p>
        </div>

        <div className="grid-2">
          <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="demo-tabs">
                <button className={mode === "web" ? "active" : ""} onClick={() => setMode("web")}>Web 一键</button>
                <button className={mode === "cli" ? "active" : ""} onClick={() => setMode("cli")}>CLI fallback</button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={reset}>重置</button>
            </div>

            {mode === "web" && (<>
              <div className="installer-frame">
                <div className="installer-icon">PR</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>PR Review Checklist</div>
                  <div className="small">v2.0.1 · 4.7 KB bundle</div>
                </div>
                <button className={`btn ${installed ? "" : "btn-primary"}`} onClick={startInstall} disabled={progress > 0 && !installed}>
                  {installed ? <><IconCheck size={14} /> 已安装</> : progress > 0 ? "安装中…" : <><IconDownload size={14} /> 一键安装</>}
                </button>
              </div>
              {progress > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="micro">{
                      progress < 30 ? "→ 拉取 install-intent token" :
                      progress < 60 ? "→ 唤起 sharon://install" :
                      progress < 90 ? "→ daemon 解包到 ~/.claude/skills/" :
                      "✓ 完成"
                    }</span>
                    <span className="micro">{Math.round(progress)}%</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              {installed && (
                <div className="caption">
                  <IconCheck size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
                  <div><strong>已写入 <code className="mono">~/.claude/skills/pr-review-checklist/</code></strong>。下次 Claude Code 启动即生效。</div>
                </div>
              )}
            </>)}

            {mode === "cli" && (<>
              <div className="caption">
                <IconTerminal size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>如果浏览器没识别 <code className="mono">sharon://</code>，会自动展示等价的 CLI 命令——复制即可。</div>
              </div>
              <div className="terminal">
                <div className="terminal-head">
                  <div className="tdot" /><div className="tdot" /><div className="tdot" />
                  <div className="ttitle">~/code · zsh</div>
                </div>
                <div className="terminal-body">
                  <div className="term-line"><span className="term-prompt">$</span> sharon install pr-review-checklist</div>
                  <div className="term-line term-dim">→ 解析最新版本…</div>
                  <div className="term-line term-dim">→ 下载 bundle.tgz (4.7 KB)</div>
                  <div className="term-line term-dim">→ 校验签名…</div>
                  <div className="term-line term-ok">✓ 已写入 ~/.claude/skills/pr-review-checklist/</div>
                  <div className="term-line"><span className="term-prompt">$</span><span className="term-cursor" /></div>
                </div>
              </div>
            </>)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">install-intent</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>每次安装都过短时 token</div>
              <p className="small" style={{ marginTop: 0 }}>Web 端按"安装"时拿到一次性签名 token，CLI 用它去服务器换 bundle。token 只活 60s——拷贝到聊天里也复用不了。</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">offline-friendly</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>装完即可断网用</div>
              <p className="small" style={{ marginTop: 0 }}>bundle 是本地 tgz，运行时 Claude 不去 sharon 拉东西——市场只是分发渠道，不是运行时依赖。</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">uninstall = signal</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>卸载会被记下来</div>
              <p className="small" style={{ marginTop: 0 }}>不是审查，是产品反馈：<code className="mono">sharon uninstall</code> 把信号回流到 leader 视图，让你看见哪些 skill 实际没人留下来用。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PUSH / INBOX / RETENTION ---------------- */
function PushSection({ persona, setPersona }) {
  return (
    <section className="section" id="push" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 6 · 推送 · 留存信号</div>
          <h2 className="h2">从"找 skill"到"被推 skill"，再到"看谁还在用"。</h2>
          <p className="lede">Leader 可以把关键 skill 推到全员收件箱；成员侧 <code className="mono">sharon receive</code> 自动安装并回 ack。卸载 → 留存信号 → leader 视图。这是闭环，不是单向广播。</p>
        </div>

        <div className="seg" style={{ marginBottom: 24 }}>
          <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>Leader 视角</button>
          <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>Member 视角</button>
        </div>

        {persona === "leader" ? <LeaderPushView /> : <MemberInboxView />}
      </div>
    </section>
  );
}

function LeaderPushView() {
  const [selectedSkill, setSelectedSkill] = useStateS("pr-review-checklist");
  const [sent, setSent] = useStateS(false);
  const team = SHARON_DATA.team;
  const totalRetention = team.reduce((s, t) => s + t.retention, 0) / team.length;

  return (
    <div className="grid-2">
      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600 }}>新推送</div>
          <div className="small">选 skill → 写一句话 → 推到全员</div>
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>skill</div>
          <select
            value={selectedSkill} onChange={e => { setSelectedSkill(e.target.value); setSent(false); }}
            style={{
              width: "100%", padding: "8px 12px",
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", color: "var(--ink)",
              fontFamily: "inherit", fontSize: 13.5,
            }}>
            {SHARON_DATA.skills.map(s => <option key={s.slug} value={s.slug}>{s.name} · v{s.version}</option>)}
          </select>
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>留言（可选）</div>
          <textarea
            defaultValue="团队规范升级，请所有人安装。下周一开始检查。"
            style={{
              width: "100%", padding: "10px 12px", minHeight: 80,
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--surface)", color: "var(--ink)",
              fontFamily: "inherit", fontSize: 13, resize: "vertical",
            }}
          />
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>推送给</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="badge badge-blue">全部成员 ({team.filter(t => t.role === "member").length})</span>
            <span className="badge">不含 leader</span>
          </div>
        </div>
        <button className={`btn ${sent ? "" : "btn-primary"}`} onClick={() => setSent(true)} style={{ marginTop: 4, justifyContent: "center" }}>
          {sent ? <><IconCheck size={14} /> 已推送 · 5/{team.filter(t => t.role === "member").length} 已 ack</> : <><IconSend size={14} /> 推送</>}
        </button>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
          <div>
            <div className="micro">team retention</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.4px", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              <AnimatedNumber value={totalRetention * 100} format={v => `${v.toFixed(1)}%`} />
            </div>
            <div className="small">所有 skill 加权平均</div>
          </div>
          <span className="badge badge-green"><span className="dot dot-green" />回流中</span>
        </div>

        <table className="team">
          <thead>
            <tr>
              <th>成员</th>
              <th style={{ width: 80 }}>已安装</th>
              <th style={{ width: 110 }}>个人留存</th>
            </tr>
          </thead>
          <tbody>
            {team.map(m => (
              <tr key={m.handle}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar handle={m.handle} role={m.role} size={22} />
                    <span>{m.handle}</span>
                    {m.role === "leader" && <span className="badge badge-blue">L</span>}
                  </div>
                </td>
                <td className="mono">{m.installed}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className={`progress ${m.retention < 0.5 ? "" : m.retention < 0.8 ? "progress-amber" : "progress-green"}`} style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${m.retention * 100}%` }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)", minWidth: 32 }}>{Math.round(m.retention * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="caption" style={{ marginTop: 18 }}>
          <IconUsers size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>@newbie 的留存只有 32%。</strong> 不是骂他，是提示：要么 onboard 没跟上，要么推的 skill 跟他岗位不匹配。</div>
        </div>
      </div>
    </div>
  );
}

function MemberInboxView() {
  const [inbox, setInbox] = useStateS(SHARON_DATA.inbox);
  const handleAction = (id, status) => setInbox(prev => prev.map(it => it.id === id ? { ...it, status } : it));
  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div className="card">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar handle="@chenjie" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>收件箱</div>
              <div className="small" style={{ fontSize: 12 }}>@chenjie 视角</div>
            </div>
          </div>
          <span className="badge badge-rose"><span className="dot dot-rose" />{inbox.filter(i => i.status === "pending").length} 待处理</span>
        </div>
        {inbox.map(i => (
          <div key={i.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{i.skill}</div>
                <div className="small" style={{ fontSize: 12, marginTop: 2 }}>
                  来自 <span style={{ color: "var(--ink)" }}>{i.from}</span> · v{i.version} · {i.pushedAt}
                </div>
              </div>
              {i.status === "pending" && <span className="badge badge-amber">待处理</span>}
              {i.status === "installed" && <span className="badge badge-green">已安装</span>}
              {i.status === "skipped" && <span className="badge">已跳过</span>}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)", padding: "10px 12px", background: "var(--bg-sunk)", borderRadius: 8 }}>"{i.note}"</div>
            {i.status === "pending" && (
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => handleAction(i.id, "skipped")}>稍后</button>
                <button className="btn btn-sm btn-primary" onClick={() => handleAction(i.id, "installed")}>
                  <IconDownload size={12} /> 立即安装
                </button>
              </div>
            )}
          </div>
        ))}
        <div style={{ padding: "10px 18px" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setInbox(SHARON_DATA.inbox)}>重置演示</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <IconInbox size={18} />
            </div>
            <div>
              <div className="h3">推送 ≠ 强制</div>
              <p className="small" style={{ marginTop: 4 }}>"稍后"和"立即安装"都不会被 leader 看见名字——他看到的是<strong>留存信号</strong>，不是行为日志。</p>
            </div>
          </div>
        </div>

        <div className="terminal">
          <div className="terminal-head">
            <div className="tdot" /><div className="tdot" /><div className="tdot" />
            <div className="ttitle">sharon receive · 后台 daemon</div>
          </div>
          <div className="terminal-body">
            <div className="term-line"><span className="term-prompt">$</span> sharon receive</div>
            <div className="term-line term-dim">→ 监听 leader 推送队列…</div>
            <div className="term-line term-ok">✓ 收到推送：Incident Commander v1.0.0</div>
            <div className="term-line term-dim">→ 自动安装 + 回写 ack</div>
            <div className="term-line term-ok">✓ done。已上报留存信号。</div>
            <div className="term-line term-dim">→ 继续监听…<span className="term-cursor" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- LIVE PROTOTYPE EMBED ---------------- */
function LivePrototypeSection({ persona, setPersona }) {
  const ROUTES = [
    { id: "/browse", label: "浏览市场" },
    { id: "/skill/sql-safety-gate", label: "Skill 详情" },
    { id: "/me", label: "个人中心" },
    { id: "/leader-queue", label: "审批队列", leaderOnly: true },
    { id: "/settings", label: "设置" },
  ];
  const [route, setRoute] = useStateS("/browse");
  return (
    <section className="section" id="live" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">不只是 mock · 仓库里就有可跑的前端</div>
          <h2 className="h2">前面演示完了。现在亲手玩真的。</h2>
          <p className="lede">下面这块是仓库里 <code className="mono">prototype/index.html</code> 的真实前端，单文件零依赖。点切换路由、切换角色，所有交互都跑在你眼前——不是 mockup。</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROUTES.map(r => (
              <button
                key={r.id}
                onClick={() => setRoute(r.id)}
                className={`btn btn-sm ${route === r.id ? "btn-primary" : ""}`}
                disabled={r.leaderOnly && persona !== "leader"}
                title={r.leaderOnly && persona !== "leader" ? "需要切到 Leader 视角" : ""}
              >
                {r.label} {r.leaderOnly && <span className="micro" style={{ marginLeft: 4 }}>L</span>}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span className="small">视角：</span>
            <div className="seg">
              <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>Member</button>
              <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>Leader</button>
            </div>
            <a className="btn btn-sm" href="prototype/index.html" target="_blank">新窗口打开 <IconArrowRight size={12} /></a>
          </div>
        </div>

        <PrototypeFrame route={route} persona={persona} onPersonaChange={setPersona} height={760} />

        <div className="caption" style={{ marginTop: 14 }}>
          <IconGithub size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>这是真前端的 100% 复制。</strong> 不是录屏、不是截图。源代码就躺在 <a href="https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/prototype" target="_blank" style={{ color: "var(--primary)" }}>prototype/index.html</a>，单文件 2790 行。</div>
        </div>
      </div>
    </section>
  );
}


/* ---------------- CLI ---------------- */
function CLISection() {
  const [active, setActive] = useStateS(0);
  const cmd = SHARON_DATA.cliCommands[active];
  const lines = useMemoS(() => [cmd.cmd, ...cmd.out], [active]);
  const { out } = useTypewriter(lines, true, 14);

  return (
    <section className="section" id="cli">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">CLI · sharon</div>
          <h2 className="h2">Web 是首页。但 CLI 是真正的工作台。</h2>
          <p className="lede">同一套 API、同一套 token —— 你可以全程不离开终端：发现、提交、安装、接收、上报全打通。</p>
        </div>

        <div className="grid-feature">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SHARON_DATA.cliCommands.map((c, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  border: `1px solid ${active === i ? "var(--ink)" : "var(--border)"}`,
                  borderRadius: 10,
                  background: active === i ? "var(--bg-sunk)" : "var(--bg-elev)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="mono" style={{ fontSize: 13.5, fontWeight: 500 }}>
                  <span style={{ color: "var(--rose)" }}>$</span> {c.cmd}
                </div>
                <div className="small" style={{ marginTop: 4, fontSize: 12.5 }}>{
                  i === 0 ? "扫描本地草稿，加入『待我决定』"
                  : i === 1 ? "把本地 skill 提交到 leader 队列"
                  : i === 2 ? "下载并安装某个 skill"
                  : "成员侧 daemon，接收 leader 推送"
                }</div>
              </button>
            ))}
          </div>

          <div className="terminal">
            <div className="terminal-head">
              <div className="tdot" /><div className="tdot" /><div className="tdot" />
              <div className="ttitle">sharon · {cmd.cmd}</div>
            </div>
            <div className="terminal-body">
              {out.map((line, i) => {
                if (i === 0) return <div key={i} className="term-line"><span className="term-prompt">$</span> {line.replace(/^\$ /, "")}</div>;
                let cls = "term-line term-dim";
                if (line.startsWith("✓")) cls = "term-line term-ok";
                else if (line.startsWith("⚠")) cls = "term-line term-warn";
                return <div key={i} className={cls}>{line}</div>;
              })}
              <span className="term-cursor" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ARCHITECTURE ---------------- */
function ArchitectureSection() {
  return (
    <section className="section" id="arch">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">技术栈</div>
          <h2 className="h2">pnpm monorepo · Fastify · SQLite · Astro。</h2>
          <p className="lede">7 个 package，单仓发布。没有 K8s、没有 microservice、没有 SaaS 依赖——一台 4 核 8G 的服务器就能扛住团队级流量。</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SHARON_DATA.packages.map((p, i) => (
            <div className="pkg-card" key={i}>
              <div style={{ flex: 1 }}>
                <div className="pkg-name">{p.name}</div>
                <div className="pkg-desc">{p.desc}</div>
              </div>
              <div className="pkg-lines">{p.lines}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            ["docker compose up", "单命令自托"],
            ["pnpm dev", "本地双服 4321/4322"],
            ["pnpm seed", "灌入 3 个样例"],
            ["pnpm test", "全包 CI 全绿"],
          ].map(([cmd, desc], i) => (
            <div key={i} style={{ padding: "14px 16px", background: "var(--bg-sunk)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--rose)" }}>$ {cmd}</div>
              <div className="small" style={{ marginTop: 4, fontSize: 12.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA / FOOTER ---------------- */
function CTASection() {
  return (
    <section className="section" style={{ background: "var(--ink)", color: "var(--bg)", borderBottom: "none" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div className="eyebrow" style={{ color: "var(--rose)" }}>v1 已上线 · MIT license</div>
          <h2 className="h2" style={{ color: "var(--bg)" }}>把 AI 时代的"团队最佳实践"<br />从聊天截图救回来。</h2>
          <p className="lede" style={{ color: "color-mix(in oklab, var(--bg) 65%, transparent)", margin: "0 auto" }}>
            一台服务器、一次 git clone、一个 docker compose up。然后让"那个学长写的好 skill"真的能在团队里留下来。
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
            <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank" style={{
              background: "var(--bg)", color: "var(--ink)", borderColor: "var(--bg)",
            }}><IconGithub size={14} /> 在 GitHub 看源码</a>
            <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/SETUP.md" target="_blank" style={{
              background: "transparent", color: "var(--bg)", borderColor: "color-mix(in oklab, var(--bg) 30%, transparent)",
            }}>SETUP.md 部署指南</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <div className="brand-mark"><span>S</span></div>
              <span>Matrix-Sharon</span>
            </div>
            <p className="small" style={{ maxWidth: 280, marginTop: 6 }}>团队的 Claude Code skill 集市，从 TeamBrain 拆分。MIT。</p>
          </div>
          <div>
            <h4>Sibling 项目</h4>
            <ul>
              <li><a href="https://github.com/libz-renlab-ai/TeamBrain" target="_blank">TeamBrain</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Riven" target="_blank">Matrix-Riven</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Viki" target="_blank">Matrix-Viki</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Plugin-memory" target="_blank">Plugin-memory</a></li>
            </ul>
          </div>
          <div>
            <h4>文档</h4>
            <ul>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/README.md" target="_blank">README</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/SETUP.md" target="_blank">SETUP</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/CHANGELOG.md" target="_blank">CHANGELOG</a></li>
            </ul>
          </div>
          <div>
            <h4>灵感来源</h4>
            <ul>
              <li><a href="https://skills.vote/" target="_blank">skills.vote</a></li>
              <li><a href="https://docs.anthropic.com/" target="_blank">Anthropic docs</a></li>
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="micro">© 2026 libz-renlab-ai · MIT license</div>
          <div className="micro">这是个独立设计的交互演示页 — 非真实运行的 sharon 实例</div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   EDITORIAL SECTIONS
   New content sections — pure typography, no interactive widgets.
   ============================================================ */

/* ---------------- PROBLEM ---------------- */
function ProblemSection() {
  return (
    <section className="section" id="problem">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">00</span>
          <span className="chapter-label">问题</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "16ch", marginBottom: 56 }}>
          AI 时代的"团队最佳实践"，<em>正在死在聊天截图里</em>。
        </h2>

        <div className="essay-grid">
          <div>
            <div className="micro" style={{ marginBottom: 14 }}>三个症状</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {[
                ["AI 生成的 skill 多到看不过来", "每个人都在让 Claude 帮自己写工具。一周下来，团队产出 50 个 skill，其中 47 个是边写边丢的草稿。"],
                ["真正好的那 3 个没人知道", "@chenjie 写的 SQL 安全检查救过两次线上事故，但只有他自己机器上有。@viki 想要也找不到。"],
                ["传播靠运气", "通过 Slack 截图、私聊文件、入职文档——每一种渠道都没版本号、没卸载、没人知道谁还在用。"],
              ].map(([t, d], i) => (
                <div key={i}>
                  <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.2px" }}>{t}</div>
                  <div className="small" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.65 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="essay-col">
            <p>这不是工具问题，是<strong>沉淀</strong>问题。</p>
            <p>Claude Code 把"写一个能跑的工具"的成本压到了十分钟。但十分钟产出的东西，团队却没有任何机制去筛选、版本化、分发、留住。</p>
            <p>结果是悖论：AI 让生产力涨了 10 倍，但<strong>团队级</strong>的最佳实践沉淀反而比 AI 之前更差——因为信噪比崩了。</p>
            <p>Sharon 解决的是这个具体问题：<strong>不是再多生成一些 skill，而是给团队一个低成本但有质量门的筛选 + 分发管道。</strong></p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- MANIFESTO ---------------- */
function ManifestoSection() {
  const PRINCIPLES = [
    {
      title: "Leader 是质量门，不是看板管理员。",
      body: <>每一条提交都打包成 diff 加静态检查，让 leader 在 <strong>30 秒</strong>内能拍板。我们不要求 leader 维护一个 backlog，我们要求他在一个安静的下午把队列清空。</>,
    },
    {
      title: "推送不等于强制。",
      body: <>Leader 可以推，成员可以装、可以延后、可以装完再卸载。Leader 看到的不是<strong>谁点了什么</strong>，而是<strong>留存信号</strong>——哪些 skill 真的留下来了。</>,
    },
    {
      title: "Scanner 不是后台监听，是发现层。",
      body: <>本地 daemon 只发文件名 + 时间戳。正文要你主动按下"提交"才离开机器。<strong>不是偷偷上传，是给你选择。</strong></>,
    },
    {
      title: "市场只是分发渠道，不是运行时依赖。",
      body: <>装完即可断网用。Claude Code 不会在运行时去 Sharon 拉东西。哪一天你想换平台或者关停 Sharon，所有已安装的 skill 在你机器上原样能跑。</>,
    },
  ];
  return (
    <section className="section" id="principles">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">III</span>
          <span className="chapter-label">设计原则</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "18ch", marginBottom: 56 }}>
          四条原则。 <em>每一条都对应一个具体的拒绝。</em>
        </h2>

        <div>
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="principle">
              <div className="principle-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="principle-title">{p.title}</div>
              <div className="principle-body">{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- NUMBERS ---------------- */
function NumbersSection() {
  const STATS = [
    { n: "30", unit: "秒", l: "Leader 一次审批的平均决策时间。diff 已打包、checks 已跑、README 已附——所有信息都在第一屏。" },
    { n: "0", unit: "ms", l: "运行时网络延迟。bundle 是本地 tgz，Claude Code 启动后不再与服务器握手。" },
    { n: "60", unit: "s", l: "install-intent token 的存活时间。复制到聊天里也用不了——token 一次性绑定到设备 + 时间窗。" },
    { n: "1", unit: "台", l: "把整个市场跑起来所需的服务器。4 核 8G 的小机器，docker compose up 即可。" },
  ];
  return (
    <section className="section" id="numbers" style={{ background: "var(--bg-sunk)", borderTop: "1px solid var(--border)" }}>
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">V</span>
          <span className="chapter-label">关键数字</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "16ch", marginBottom: 64 }}>
          每个数字背后<em>都有一个设计决策</em>。
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
          {STATS.map((s, i) => (
            <Reveal key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
              <div className="stat-big">
                <RevealNumber value={parseInt(s.n)} duration={1600} />
                <em>{s.unit}</em>
              </div>
              <div className="stat-label">{s.l}</div>
            </Reveal>
          ))}
        </div>

        <style>{`@media (max-width: 900px) { #numbers > .container > div:last-child { grid-template-columns: 1fr 1fr !important; gap: 24px !important; } }`}</style>
      </div>
    </section>
  );
}

/* ---------------- COMPARISON ---------------- */
function ComparisonSection() {
  const ROWS = [
    ["质量门", { other: ["—", "—", "—"], sharon: "Leader 审批" }],
    ["版本不可变", { other: ["—", "—", "❌"], sharon: "每次批准生成 SkillVersion" }],
    ["一键安装", { other: ["手动复制", "手动复制", "git clone"], sharon: "sharon:// + CLI" }],
    ["卸载/留存信号", { other: ["—", "—", "—"], sharon: "回流到 leader 视图" }],
    ["发现 → 提交", { other: ["截图发群", "拖文件", "PR"], sharon: "scanner 自动发现" }],
    ["运行时依赖", { other: ["—", "—", "—"], sharon: "无（本地 tgz）" }],
    ["自托管", { other: ["❌", "❌", "✓"], sharon: "✓ docker compose up" }],
  ];
  const OTHERS = ["Slack 钉群", "Notion 文档", "私有 Git 仓库"];

  return (
    <section className="section" id="compare">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">VII</span>
          <span className="chapter-label">对比</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "18ch", marginBottom: 32 }}>
          为什么不是<em>已有的工具</em>？
        </h2>
        <p className="lede" style={{ maxWidth: "60ch", marginBottom: 48, fontSize: 17 }}>
          团队不是没尝试过沉淀 AI 工具的最佳实践。Slack 钉群、Notion 文档、内部 Git 仓库——这些都做过。Sharon 想解决的是它们都没解决的<strong style={{ color: "var(--ink)" }}>那一层</strong>：可执行 + 有版本 + 有质量门 + 有留存反馈。
        </p>

        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              {OTHERS.map(o => <th key={o}>{o}</th>)}
              <th className="col-sharon-head">Matrix-Sharon</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([dim, vals], i) => (
              <tr key={dim}>
                <td>{dim}</td>
                {vals.other.map((v, j) => (
                  <td key={j} className={v === "—" || v === "❌" ? "lose" : v.startsWith("手动") || v === "git clone" || v === "PR" || v === "拖文件" || v === "截图发群" ? "warn" : "win"}>{v}</td>
                ))}
                <td className="col-sharon win">{vals.sharon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- QUOTE ---------------- */
function QuoteSection() {
  return (
    <section className="section section-narrow" id="quote" style={{ background: "var(--ink)", color: "#fff", borderBottom: "none" }}>
      <div className="container" style={{ textAlign: "center", padding: "32px 24px" }}>
        <p className="pull-quote" style={{ color: "#fff", maxWidth: "20ch", margin: "0 auto" }}>
          我们不是在做一个新的 AI 工具市场。我们在让<em style={{ color: "var(--primary-soft)" }}>那个学长写的好 skill</em>真的能在团队里活下来。
        </p>
        <div className="pull-attr" style={{ color: "rgba(255,255,255,0.5)", marginTop: 24 }}>libz · Sharon 设计文档</div>
      </div>
    </section>
  );
}

/* ---------------- MARQUEE ---------------- */
function MarqueeSection() {
  const items = [
    "SQL Safety Gate", "PR Review Checklist", "Log Analyzer", "Design Doc Template",
    "Migration Planner", "Incident Commander", "K8s Pod Inspector", "Slack Notify",
    "API Mock Generator", "Changelog Synth", "OAuth Debugger", "Cache Warmer",
    "Type Coverage", "Bundle Diff", "Migration Linter",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="marquee" style={{ background: "var(--bg-sunk)" }}>
      <div className="marquee-track">
        {doubled.map((s, i) => <span key={i}>{s}</span>)}
      </div>
    </div>
  );
}

Object.assign(window, {
  HeroSection, PhasesSection, AuthSection, BrowseSection, SubmitSection,
  ApprovalSection, InstallSection, PushSection, LivePrototypeSection,
  CLISection, ArchitectureSection, CTASection, FooterSection,
  ProblemSection, ManifestoSection, NumbersSection, ComparisonSection, QuoteSection, MarqueeSection,
});
