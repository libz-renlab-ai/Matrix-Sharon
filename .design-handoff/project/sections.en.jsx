// All section components for Matrix-Sharon showcase — English
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS, useMemo: useMemoS } = React;
const SHARON_DATA = window.SHARON_DATA_EN;

/* ---------------- HERO ---------------- */
function HeroSectionEn({ persona }) {
  return (
    <section className="section" id="overview" style={{ paddingTop: 72, paddingBottom: 80 }}>
      <div className="container">
        <div className="grid-feature">
          <div>
            <div className="eyebrow">Matrix-Sharon · v1 shipped</div>
            <h1 className="h1">
              A skill marketplace,<br />
              <span style={{ color: "var(--muted)" }}>built for teams.</span><br />
              <span style={{ color: "var(--rose)" }}>Filter the AI slop.</span>
            </h1>
            <p className="lede">
              A self-hosted marketplace for your team's Claude Code skills, plugins, and workflows.
              A local scanner finds skills you just finished writing, a leader-approval gate filters the noise, and one click installs them into <code className="mono" style={{ background: "var(--bg-sunk)", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>~/.claude/skills/</code>.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => document.getElementById("browse").scrollIntoView({ behavior: "smooth", block: "start" })}>
                Start the tour <IconArrowDown size={14} />
              </button>
              <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank">
                <IconGithub size={14} /> View on GitHub
              </a>
            </div>

            <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
              {[
                ["6", "phases all on main"],
                ["7", "monorepo packages"],
                ["10", "SQLite tables"],
                ["0", "SaaS dependencies"],
              ].map(([n, l], i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>{n}</div>
                  <div className="small">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroCanvasEn persona={persona} />
        </div>
      </div>
    </section>
  );
}

function HeroCanvasEn({ persona }) {
  const [tick, setTick] = useStateS(0);
  useEffectS(() => {
    const id = setInterval(() => setTick(t => t + 1), 2200);
    return () => clearInterval(id);
  }, []);
  const stages = ["candidate", "pending", "approved", "installing", "running"];
  const stageIdx = tick % stages.length;

  return (
    <div className="hero-canvas" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="micro">team.local — sharon dashboard</div>
        <div className="micro">{persona === "leader" ? "● leader view" : "● member view"}</div>
      </div>

      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar handle="@viki" />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>K8s Pod Inspector</div>
              <div className="small" style={{ fontSize: 12 }}>@viki · submitted just now</div>
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
            { label: "Local scanner picks it up", at: 0 },
            { label: "Leader receives a review item", at: 1 },
            { label: "Approved → immutable v1.0.0", at: 2 },
            { label: "23/28 team members install", at: 3 },
            { label: "Retention signal flowing — 91%", at: 4 },
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

      <div className="caption" style={{ marginTop: 0 }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <IconBolt size={16} />
        </div>
        <div>
          <strong>Every skill carries a full lifecycle</strong>
          — from a local draft all the way to team-wide retention, with an immutable trail at each step.
        </div>
      </div>
    </div>
  );
}

/* ---------------- PHASES RAIL ---------------- */
function PhasesSectionEn() {
  const [active, setActive] = useStateS(0);
  return (
    <section className="section section-narrow" id="phases">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">v1 · every phase on main</div>
          <h2 className="h2">Six phases. One working pipeline.</h2>
          <p className="lede">No half-built v1. Login, browse, submit, approve, install, push, retention — each one already lives on main and runs in CI.</p>
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
function AuthSectionEn() {
  const [step, setStep] = useStateS(0);
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
            <h2 className="h2">No bespoke account system.<br />Use GitHub.</h2>
            <p className="lede">
              <code className="mono">/login/github</code> → callback → signed session cookie.
              <strong style={{ color: "var(--ink)" }}> The first user who logs in automatically becomes leader</strong>, so there's no cold-start configuration step.
            </p>
            <ul style={{ paddingLeft: 0, listStyle: "none", marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Signed session cookie", "HMAC-SHA256, no external session store"],
                ["First login = leader", "No hardcoded admin, zero-config onboarding"],
                ["Leader can transfer or co-promote", "v1 ships with RBAC ready to extend"],
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
                  <h3 className="h3" style={{ marginBottom: 8 }}>Sign in to Sharon</h3>
                  <p className="small" style={{ marginBottom: 20 }}>Sign in to the team marketplace with your GitHub account.</p>
                  <button className="btn btn-primary" onClick={() => setStep(1)} style={{ width: "100%", justifyContent: "center" }}>
                    <IconGithub size={14} /> Continue with GitHub
                  </button>
                  <div className="micro" style={{ marginTop: 16 }}>The first to log in becomes leader.</div>
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
                  <div className="small">Redirecting to GitHub authorize…</div>
                </div>
              )}
              {step === 2 && (
                <div style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                    <div>→ /auth/callback</div>
                    <div>→ verify code with GitHub ✓</div>
                    <div>→ fetch user · @sharon</div>
                    <div>→ check users table… empty</div>
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
                  <div className="small" style={{ marginTop: 16 }}>Welcome. Start curating your team's marketplace.</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setStep(0)}>Reset demo</button>
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
function BrowseSectionEn() {
  const [q, setQ] = useStateS("");
  const [cat, setCat] = useStateS("All");
  const [selected, setSelected] = useStateS(SHARON_DATA.skills[0].slug);
  const cats = ["All", "Database", "Workflow", "Observability", "Writing"];
  const filtered = SHARON_DATA.skills.filter(s => {
    if (cat !== "All" && s.category !== cat) return false;
    if (q && !(s.name + s.summary + s.tags.join(" ")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const cur = SHARON_DATA.skills.find(s => s.slug === selected);

  return (
    <section className="section" id="browse">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 3 · Browse</div>
          <h2 className="h2">Start with what the team already picked.</h2>
          <p className="lede">The home page shows only approved skills — not 100 "best practices" pulled out of an LLM, but the ones a teammate wrote, your leader approved, and that ship as an immutable version.</p>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", display: "flex", gap: 12, borderBottom: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><IconSearch size={14} /></div>
              <input
                type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search skills, tags, authors…"
                style={{
                  width: "100%", padding: "7px 12px 7px 32px",
                  border: "1px solid var(--border)", borderRadius: 8,
                  background: "var(--bg)", color: "var(--ink)",
                  fontFamily: "inherit", fontSize: 13.5, outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--ink)"}
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
              {filtered.length === 0 && <div className="small" style={{ padding: 20, textAlign: "center" }}>No matches.</div>}
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
                      <IconDownload size={12} /> {s.installs}/{s.teamSize} installed
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IconStar size={12} /> {s.stars}
                    </span>
                    {s.pushedBy === "leader" && <span className="badge badge-blue" style={{ marginLeft: "auto" }}>leader pushed</span>}
                  </div>
                </div>
              ))}
            </div>

            <SkillDetailEn skill={cur} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SkillDetailEn({ skill }) {
  const [tab, setTab] = useStateS("README");
  const [installing, setInstalling] = useStateS(null);

  useEffectS(() => { setInstalling(null); setTab("README"); }, [skill?.slug]);

  if (!skill) return <div style={{ padding: 24 }} className="small">Pick a skill to see details.</div>;

  return (
    <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div>
            <h3 className="h3" style={{ fontSize: 22, marginBottom: 4 }}>{skill.name}</h3>
            <div className="small">
              <code className="mono">{skill.slug}</code> · v{skill.version} · updated {skill.updated}
            </div>
          </div>
          <button
            className={`btn ${installing === "done" ? "" : "btn-rose"}`}
            onClick={() => {
              if (installing) return;
              setInstalling("web");
              setTimeout(() => setInstalling("done"), 1400);
            }}
          >
            {installing === "web" && <span>Installing…</span>}
            {installing === "done" && <><IconCheck size={14} /> Installed</>}
            {!installing && <><IconDownload size={14} /> One-click install</>}
          </button>
        </div>
      </div>

      <div className="demo-tabs">
        {["README", "Permissions", "Versions"].map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "README" && (
        <div>
          <p style={{ marginTop: 0, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>{skill.summary}</p>
          <div className="small" style={{ marginTop: 10, marginBottom: 6, color: "var(--ink)" }}>How it works</div>
          <ol style={{ paddingLeft: 18, margin: 0, color: "var(--muted)", fontSize: 13.5 }}>
            {skill.bodySteps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ol>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {skill.tags.map(t => <span key={t} className="badge">#{t}</span>)}
          </div>
        </div>
      )}
      {tab === "Permissions" && (
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
          <div className="small" style={{ marginBottom: 8, color: "var(--ink)" }}>Declared scopes</div>
          {[
            ["Read local code", true],
            ["Execute shell commands", skill.category === "Database"],
            ["Network access", false],
            ["Write to ~/.claude", true],
          ].map(([p, on], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
              <span>{p}</span>
              <span className={`badge ${on ? "badge-amber" : ""}`}>{on ? "needed" : "no"}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "Versions" && (
        <div style={{ fontSize: 13 }}>
          {[
            { v: skill.version, at: skill.updated, by: skill.author, latest: true, note: "patch: clearer error messages" },
            { v: "1.3.0", at: "last week", by: skill.author, note: "feat: dry-run mode" },
            { v: "1.2.0", at: "last month", by: skill.author, note: "initial release" },
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
          <div><strong>Every approval freezes into an immutable version.</strong> You install v{skill.version}, not a drifting `latest`.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CANDIDATE / SUBMIT ---------------- */
function SubmitSectionEn() {
  const [candidates, setCandidates] = useStateS(SHARON_DATA.candidates);
  const [submitting, setSubmitting] = useStateS(null);

  const handleSubmit = (id) => {
    setSubmitting(id);
    setTimeout(() => {
      setCandidates(prev => prev.filter(c => c.id !== id));
      setSubmitting(null);
    }, 1200);
  };
  const handleDismiss = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  return (
    <section className="section" id="submit">
      <div className="container">
        <div className="grid-feature">
          <div>
            <div className="eyebrow">Phase 4 · Submit (scanner mode)</div>
            <h2 className="h2">Don't force "think first, write later".<br />Write it, then the scanner asks if you want to share.</h2>
            <p className="lede">
              A local daemon watches <code className="mono" style={{ background: "var(--bg-sunk)", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>~/.claude/skills/local/</code>.
              When a file goes quiet, it drops into your "Up to you" queue —
              <strong style={{ color: "var(--ink)" }}> not auto-uploaded, just surfaced.</strong>
            </p>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["The scanner never uploads content", "Only filename + mtime. Body stays local until you press Submit."],
                ["Drafts can churn forever locally", "Nothing leaves your machine until you decide it should."],
                ["README is mandatory to submit", "Missing skill.yaml or README — blocked at the client."],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{ marginTop: 1, color: "var(--rose)" }}><IconCheck size={16} /></div>
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
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Your inbox · Up to you</div>
                <div className="small" style={{ fontSize: 12 }}>Skills the scanner found locally</div>
              </div>
              <span className="badge badge-rose"><span className="dot dot-rose" />{candidates.length} pending</span>
            </div>
            <div>
              {candidates.length === 0 && (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <div className="small">Queue empty.</div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={() => setCandidates(SHARON_DATA.candidates)}>Reset demo</button>
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
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDismiss(c.id)}>Dismiss</button>
                      <button
                        className="btn btn-sm btn-rose"
                        disabled={submitting === c.id}
                        onClick={() => handleSubmit(c.id)}
                      >
                        {submitting === c.id ? "Uploading…" : <><IconUpload size={12} /> Submit</>}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)" }}>{c.summary}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                    <span><IconFile size={11} /> {c.lines} lines</span>
                    <span>
                      {c.hasTests ? <span style={{ color: "var(--green)" }}>✓ has tests</span> : <span style={{ color: "var(--amber)" }}>⚠ no tests</span>}
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
function ApprovalSectionEn({ persona, setPersona }) {
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
            <div className="eyebrow">Phase 4 · Leader approval</div>
            <h2 className="h2">The leader is a quality gate, not a backlog manager.</h2>
            <p className="lede">Every submission lands as a diff with static checks pre-run, so a leader can decide in 30 seconds. Approve → immediate immutable SkillVersion + bundle.tgz.</p>
          </div>
          {persona !== "leader" && (
            <button className="btn" onClick={() => setPersona("leader")}>Switch to leader view <IconArrowRight size={14} /></button>
          )}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar handle="@sharon" role="leader" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Leader review queue</div>
                <div className="small" style={{ fontSize: 12 }}>@sharon's view</div>
              </div>
            </div>
            <div className="micro">{queue.length} pending</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 460 }}>
            <div style={{ borderRight: "1px solid var(--border)" }}>
              {queue.length === 0 && (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <IconCheck size={18} />
                  </div>
                  <div style={{ fontWeight: 500 }}>Inbox zero</div>
                  <div className="small" style={{ marginTop: 4 }}>You define what counts as a team skill.</div>
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 14 }} onClick={reset}>Reset demo</button>
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
                    borderLeft: active?.id === q.id ? "2px solid var(--rose)" : "2px solid transparent",
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
                  <div className="small">
                    {active.author} · {active.authorRole} · submitted {active.submittedAt}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{active.summary}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8 }}>
                    <div className="micro">diff</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      <span style={{ color: "var(--green)" }}>+{active.diffStats.added}</span>{" "}
                      <span style={{ color: "var(--red)" }}>-{active.diffStats.removed}</span>
                    </div>
                  </div>
                  <div style={{ padding: 14, background: "var(--bg-sunk)", borderRadius: 8 }}>
                    <div className="micro">checks</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      {active.checks.filter(c => c.ok).length}/{active.checks.length} pass
                    </div>
                  </div>
                </div>

                <div>
                  <div className="micro" style={{ marginBottom: 8 }}>Static checks</div>
                  {active.checks.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border)", fontSize: 13.5 }}>
                      {c.ok ? <span style={{ color: "var(--green)" }}><IconCheck size={14} /></span> : <span style={{ color: "var(--red)" }}><IconX size={14} /></span>}
                      <span style={{ color: c.ok ? "var(--ink)" : "var(--red)" }}>{c.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
                  <button className="btn btn-danger" onClick={() => decide("reject")}><IconX size={14} /> Reject + comment</button>
                  <button className="btn btn-ghost btn-sm">View full README</button>
                  <button className="btn btn-rose" style={{ marginLeft: "auto" }} onClick={() => decide("approve")}>
                    <IconCheck size={14} /> Approve → cut v1.0.0
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
              ? <><span style={{ color: "var(--green)" }}><IconCheck size={14} /></span> {toast.name} approved · v1.0.0 + bundle.tgz published</>
              : <><span style={{ color: "var(--red)" }}><IconX size={14} /></span> {toast.name} rejected</>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- INSTALL ---------------- */
function InstallSectionEn() {
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
      } else {
        setProgress(p);
      }
    }, 220);
  };

  const reset = () => { setProgress(0); setInstalled(false); };

  return (
    <section className="section" id="install">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 5 · One-click install</div>
          <h2 className="h2">Click in the browser. The local daemon takes it from there.</h2>
          <p className="lede">
            A <code className="mono">sharon://</code> URL hands off from browser to the local CLI. No daemon? It falls back to a copy-paste command.
          </p>
        </div>

        <div className="grid-2">
          <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="demo-tabs">
                <button className={mode === "web" ? "active" : ""} onClick={() => setMode("web")}>Web</button>
                <button className={mode === "cli" ? "active" : ""} onClick={() => setMode("cli")}>CLI fallback</button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={reset}>Reset</button>
            </div>

            {mode === "web" && (
              <>
                <div className="installer-frame">
                  <div className="installer-icon">PR</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>PR Review Checklist</div>
                    <div className="small">v2.0.1 · 4.7 KB bundle</div>
                  </div>
                  <button className={`btn ${installed ? "" : "btn-rose"}`} onClick={startInstall} disabled={progress > 0 && !installed}>
                    {installed ? <><IconCheck size={14} /> Installed</> : progress > 0 ? "Installing…" : <><IconDownload size={14} /> Install</>}
                  </button>
                </div>

                {progress > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span className="micro">{
                        progress < 30 ? "→ fetching install-intent token" :
                        progress < 60 ? "→ invoking sharon://install" :
                        progress < 90 ? "→ daemon writing to ~/.claude/skills/" :
                        "✓ complete"
                      }</span>
                      <span className="micro">{Math.round(progress)}%</span>
                    </div>
                    <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                  </div>
                )}

                {installed && (
                  <div className="caption">
                    <IconCheck size={16} style={{ color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
                    <div><strong>Written to <code className="mono">~/.claude/skills/pr-review-checklist/</code></strong>. Active on the next Claude Code restart.</div>
                  </div>
                )}
              </>
            )}

            {mode === "cli" && (
              <>
                <div className="caption">
                  <IconTerminal size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>If the browser can't open <code className="mono">sharon://</code>, you'll see the equivalent CLI command — copy and paste.</div>
                </div>
                <div className="terminal">
                  <div className="terminal-head">
                    <div className="tdot" /><div className="tdot" /><div className="tdot" />
                    <div className="ttitle">~/code · zsh</div>
                  </div>
                  <div className="terminal-body">
                    <div className="term-line"><span className="term-prompt">$</span> sharon install pr-review-checklist</div>
                    <div className="term-line term-dim">→ resolving latest version…</div>
                    <div className="term-line term-dim">→ downloading bundle.tgz (4.7 KB)</div>
                    <div className="term-line term-dim">→ verifying signature…</div>
                    <div className="term-line term-ok">✓ written to ~/.claude/skills/pr-review-checklist/</div>
                    <div className="term-line"><span className="term-prompt">$</span><span className="term-cursor" /></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">install-intent</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>Every install goes through a short-lived token</div>
              <p className="small" style={{ marginTop: 0 }}>The web button mints a one-time signed token; the CLI uses it to fetch the bundle. The token lives 60 seconds — pasted into a chat, it won't work for anyone else.</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">offline-friendly</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>Installed once, runs offline</div>
              <p className="small" style={{ marginTop: 0 }}>The bundle is a local tgz. Claude never calls Sharon at runtime — the marketplace is a distribution channel, not a runtime dependency.</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="micro">uninstall = signal</div>
              <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>Uninstalls are recorded</div>
              <p className="small" style={{ marginTop: 0 }}>Not surveillance — product feedback. <code className="mono">sharon uninstall</code> flows back to the leader view so you can see which skills nobody actually keeps.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PUSH / INBOX / RETENTION ---------------- */
function PushSectionEn({ persona, setPersona }) {
  return (
    <section className="section" id="push" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Phase 6 · Push · retention signal</div>
          <h2 className="h2">From "go find a skill" to "you got pushed one" — then "who actually kept it".</h2>
          <p className="lede">Leaders can push key skills to every inbox; members run <code className="mono">sharon receive</code> to install and ack. Uninstalls flow back as a retention signal. This is a loop, not a one-way broadcast.</p>
        </div>

        <div className="seg" style={{ marginBottom: 24 }}>
          <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>Leader view</button>
          <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>Member view</button>
        </div>

        {persona === "leader" ? <LeaderPushViewEn /> : <MemberInboxViewEn />}
      </div>
    </section>
  );
}

function LeaderPushViewEn() {
  const [selectedSkill, setSelectedSkill] = useStateS("pr-review-checklist");
  const [sent, setSent] = useStateS(false);
  const team = SHARON_DATA.team;
  const totalRetention = team.reduce((s, t) => s + t.retention, 0) / team.length;

  return (
    <div className="grid-2">
      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600 }}>New push</div>
          <div className="small">Pick a skill, add a one-liner, push to the team.</div>
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>skill</div>
          <select
            value={selectedSkill} onChange={e => { setSelectedSkill(e.target.value); setSent(false); }}
            style={{
              width: "100%", padding: "8px 12px",
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--bg-elev)", color: "var(--ink)",
              fontFamily: "inherit", fontSize: 13.5,
            }}>
            {SHARON_DATA.skills.map(s => <option key={s.slug} value={s.slug}>{s.name} · v{s.version}</option>)}
          </select>
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>note (optional)</div>
          <textarea
            defaultValue="Team standard updated. Please install. We'll start enforcing this on Monday."
            style={{
              width: "100%", padding: "10px 12px", minHeight: 80,
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--bg-elev)", color: "var(--ink)",
              fontFamily: "inherit", fontSize: 13, resize: "vertical",
            }}
          />
        </div>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>push to</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="badge badge-blue">All members ({team.filter(t => t.role === "member").length})</span>
            <span className="badge">excluding leader</span>
          </div>
        </div>
        <button
          className={`btn ${sent ? "" : "btn-rose"}`}
          onClick={() => setSent(true)}
          style={{ marginTop: 4, justifyContent: "center" }}
        >
          {sent ? <><IconCheck size={14} /> Pushed · 5/{team.filter(t => t.role === "member").length} acked</> : <><IconSend size={14} /> Push</>}
        </button>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
          <div>
            <div className="micro">team retention</div>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              <AnimatedNumber value={totalRetention * 100} format={v => `${v.toFixed(1)}%`} />
            </div>
            <div className="small">weighted across all installed skills</div>
          </div>
          <span className="badge badge-green"><span className="dot dot-green" />live</span>
        </div>

        <table className="team">
          <thead>
            <tr>
              <th>member</th>
              <th style={{ width: 80 }}>installed</th>
              <th style={{ width: 110 }}>retention</th>
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
          <div><strong>@newbie's retention is only 32%.</strong> Not a callout — a hint. Either onboarding didn't land, or the skills you pushed don't fit their role.</div>
        </div>
      </div>
    </div>
  );
}

function MemberInboxViewEn() {
  const [inbox, setInbox] = useStateS(SHARON_DATA.inbox);
  const handleAction = (id, status) => {
    setInbox(prev => prev.map(it => it.id === id ? { ...it, status } : it));
  };
  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div className="card">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar handle="@chenjie" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>Inbox</div>
              <div className="small" style={{ fontSize: 12 }}>@chenjie's view</div>
            </div>
          </div>
          <span className="badge badge-rose"><span className="dot dot-rose" />{inbox.filter(i => i.status === "pending").length} pending</span>
        </div>
        {inbox.map(i => (
          <div key={i.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{i.skill}</div>
                <div className="small" style={{ fontSize: 12, marginTop: 2 }}>
                  from <span style={{ color: "var(--ink)" }}>{i.from}</span> · v{i.version} · {i.pushedAt}
                </div>
              </div>
              {i.status === "pending" && <span className="badge badge-amber">pending</span>}
              {i.status === "installed" && <span className="badge badge-green">installed</span>}
              {i.status === "skipped" && <span className="badge">skipped</span>}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-2)", padding: "10px 12px", background: "var(--bg-sunk)", borderRadius: 8 }}>"{i.note}"</div>
            {i.status === "pending" && (
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => handleAction(i.id, "skipped")}>Later</button>
                <button className="btn btn-sm btn-rose" onClick={() => handleAction(i.id, "installed")}>
                  <IconDownload size={12} /> Install now
                </button>
              </div>
            )}
          </div>
        ))}
        <div style={{ padding: "10px 18px" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setInbox(SHARON_DATA.inbox)}>Reset demo</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--blue-soft)", color: "var(--blue)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <IconInbox size={18} />
            </div>
            <div>
              <div className="h3">Push ≠ force</div>
              <p className="small" style={{ marginTop: 4 }}>"Later" and "Install now" aren't reported by name — the leader sees <strong>retention</strong>, not your individual click log.</p>
            </div>
          </div>
        </div>

        <div className="terminal">
          <div className="terminal-head">
            <div className="tdot" /><div className="tdot" /><div className="tdot" />
            <div className="ttitle">sharon receive · background daemon</div>
          </div>
          <div className="terminal-body">
            <div className="term-line"><span className="term-prompt">$</span> sharon receive</div>
            <div className="term-line term-dim">→ listening for leader pushes…</div>
            <div className="term-line term-ok">✓ received: Incident Commander v1.0.0</div>
            <div className="term-line term-dim">→ auto-installing + writing ack</div>
            <div className="term-line term-ok">✓ done. retention signal reported.</div>
            <div className="term-line term-dim">→ still listening…<span className="term-cursor" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- LIVE PROTOTYPE EMBED ---------------- */
function LivePrototypeSectionEn({ persona, setPersona }) {
  const ROUTES = [
    { id: "/browse", label: "Browse" },
    { id: "/skill/sql-safety-gate", label: "Skill detail" },
    { id: "/me", label: "My center" },
    { id: "/leader-queue", label: "Review queue", leaderOnly: true },
    { id: "/settings", label: "Settings" },
  ];
  const [route, setRoute] = useStateS("/browse");
  return (
    <section className="section" id="live" style={{ background: "var(--bg-sunk)" }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Not a mock — the real prototype lives in the repo</div>
          <h2 className="h2">Demos done. Now play with the real thing.</h2>
          <p className="lede">Below is the actual frontend from the repo — <code className="mono">prototype/index.html</code>, a single-file zero-dependency build. Click around, swap routes, switch role. It's not a mockup.</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROUTES.map(r => (
              <button
                key={r.id}
                onClick={() => setRoute(r.id)}
                className={`btn btn-sm ${route === r.id ? "btn-primary" : ""}`}
                disabled={r.leaderOnly && persona !== "leader"}
                title={r.leaderOnly && persona !== "leader" ? "Switch to Leader view first" : ""}
              >
                {r.label} {r.leaderOnly && <span className="micro" style={{ marginLeft: 4 }}>L</span>}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span className="small">Role:</span>
            <div className="seg">
              <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>Member</button>
              <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>Leader</button>
            </div>
            <a className="btn btn-sm" href="prototype/index.html" target="_blank">Open in new tab <IconArrowRight size={12} /></a>
          </div>
        </div>

        <PrototypeFrame route={route} persona={persona} onPersonaChange={setPersona} height={760} />

        <div className="caption" style={{ marginTop: 14 }}>
          <IconGithub size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><strong>This is 100% the real frontend — not a screencap.</strong> Source is at <a href="https://github.com/libz-renlab-ai/Matrix-Sharon/tree/main/prototype" target="_blank" style={{ color: "var(--primary)" }}>prototype/index.html</a> — single file, 2790 lines, zero dependencies. Original Chinese UI; the frame stays in source language.</div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- CLI ---------------- */
function CLISectionEn() {
  const [active, setActive] = useStateS(0);
  const cmd = SHARON_DATA.cliCommands[active];
  const lines = useMemoS(() => [cmd.cmd, ...cmd.out], [active]);
  const { out } = useTypewriter(lines, true, 14);

  return (
    <section className="section" id="cli">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">CLI · sharon</div>
          <h2 className="h2">The web is the front page. The CLI is the workbench.</h2>
          <p className="lede">Same API, same token — you can stay in the terminal end-to-end: discover, submit, install, receive, report.</p>
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
                  i === 0 ? "Scan local drafts; add them to 'Up to you'."
                  : i === 1 ? "Push a local skill to the leader queue."
                  : i === 2 ? "Download and install a skill."
                  : "Member-side daemon — receive leader pushes."
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
function ArchitectureSectionEn() {
  return (
    <section className="section" id="arch">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Stack</div>
          <h2 className="h2">pnpm monorepo · Fastify · SQLite · Astro.</h2>
          <p className="lede">Seven packages, one repo. No Kubernetes, no microservices, no SaaS dependencies — a 4-core 8GB box runs the whole team.</p>
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
            ["docker compose up", "single-command self-host"],
            ["pnpm dev", "local server + web on 4321/4322"],
            ["pnpm seed", "load 3 sample skills"],
            ["pnpm test", "every package green in CI"],
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
function CTASectionEn() {
  return (
    <section className="section" style={{ background: "var(--ink)", color: "var(--bg)", borderBottom: "none" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div className="eyebrow" style={{ color: "var(--rose)" }}>v1 shipped · MIT license</div>
          <h2 className="h2" style={{ color: "var(--bg)" }}>Rescue "team best practices"<br />from the chat-screenshot graveyard.</h2>
          <p className="lede" style={{ color: "color-mix(in oklab, var(--bg) 65%, transparent)", margin: "0 auto" }}>
            One server. One git clone. One docker compose up. Then your senior's good skill actually lives long enough to be used by everyone else.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
            <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon" target="_blank" style={{
              background: "var(--bg)", color: "var(--ink)", borderColor: "var(--bg)",
            }}><IconGithub size={14} /> Read source on GitHub</a>
            <a className="btn" href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/SETUP.md" target="_blank" style={{
              background: "transparent", color: "var(--bg)", borderColor: "color-mix(in oklab, var(--bg) 30%, transparent)",
            }}>SETUP.md</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSectionEn() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <div className="brand-mark"><span>S</span></div>
              <span>Matrix-Sharon</span>
            </div>
            <p className="small" style={{ maxWidth: 280, marginTop: 6 }}>A team skill marketplace for Claude Code, spun out of TeamBrain. MIT.</p>
          </div>
          <div>
            <h4>Sibling projects</h4>
            <ul>
              <li><a href="https://github.com/libz-renlab-ai/TeamBrain" target="_blank">TeamBrain</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Riven" target="_blank">Matrix-Riven</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Viki" target="_blank">Matrix-Viki</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Plugin-memory" target="_blank">Plugin-memory</a></li>
            </ul>
          </div>
          <div>
            <h4>Docs</h4>
            <ul>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/README.md" target="_blank">README</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/SETUP.md" target="_blank">SETUP</a></li>
              <li><a href="https://github.com/libz-renlab-ai/Matrix-Sharon/blob/main/CHANGELOG.md" target="_blank">CHANGELOG</a></li>
            </ul>
          </div>
          <div>
            <h4>Inspiration</h4>
            <ul>
              <li><a href="https://skills.vote/" target="_blank">skills.vote</a></li>
              <li><a href="https://docs.anthropic.com/" target="_blank">Anthropic docs</a></li>
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="micro">© 2026 libz-renlab-ai · MIT license</div>
          <div className="micro">An independent interactive showcase — not a live Sharon instance.</div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   EDITORIAL SECTIONS (EN)
   ============================================================ */

function ProblemSectionEn() {
  return (
    <section className="section" id="problem">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">00</span>
          <span className="chapter-label">The problem</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "18ch", marginBottom: 56 }}>
          The team's best practices in the AI era <em>are dying in chat screenshots.</em>
        </h2>

        <div className="essay-grid">
          <div>
            <div className="micro" style={{ marginBottom: 14 }}>Three symptoms</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {[
                ["Too many AI-generated skills to track", "Everyone's getting Claude to build tools. In a week the team produces 50 skills — 47 of them are throwaway drafts."],
                ["The three good ones — nobody knows about", "Chenjie's SQL safety check saved two production incidents. It only exists on his machine. Viki wants it and can't find it."],
                ["Distribution is luck", "Slack screenshots, DMs with files, onboarding docs — none of them version, none of them uninstall, none of them tell you who's still using what."],
              ].map(([t, d], i) => (
                <div key={i}>
                  <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.2px" }}>{t}</div>
                  <div className="small" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.65 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="essay-col">
            <p>This isn't a tool problem. It's a <strong>sedimentation</strong> problem.</p>
            <p>Claude Code drove the cost of "build a working tool" down to ten minutes. But teams have no mechanism to filter, version, distribute, or retain what those ten minutes produce.</p>
            <p>The result is a paradox: AI made individual productivity 10x better, but <strong>team-level</strong> best-practice sedimentation got worse — because the signal-to-noise ratio collapsed.</p>
            <p>Sharon solves exactly this: <strong>not produce more skills, but give teams a low-cost, quality-gated filter + distribution pipeline.</strong></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManifestoSectionEn() {
  const PRINCIPLES = [
    {
      title: "The leader is a quality gate, not a backlog manager.",
      body: <>Every submission lands as a diff with static checks pre-run, so a leader can decide in <strong>30 seconds</strong>. We don't ask leaders to maintain a queue. We ask them to clear it in one quiet afternoon.</>,
    },
    {
      title: "Push doesn't mean force.",
      body: <>Leaders can push. Members can install, defer, or uninstall after. Leaders see <strong>retention signal</strong>, not a click log — what stuck, not who clicked.</>,
    },
    {
      title: "The scanner isn't surveillance. It's a discovery layer.",
      body: <>The local daemon only sends filenames + mtime. Body content stays on your machine until you press Submit. <strong>Not an upload pipeline. A choice surface.</strong></>,
    },
    {
      title: "The marketplace is a distribution channel, not a runtime dependency.",
      body: <>Once installed, you can go offline. Claude Code never calls Sharon at runtime. If you switch platforms or shut Sharon down tomorrow, every installed skill keeps working on every machine.</>,
    },
  ];
  return (
    <section className="section" id="principles">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">III</span>
          <span className="chapter-label">Design principles</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "20ch", marginBottom: 56 }}>
          Four principles. <em>Each one is a specific refusal.</em>
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

function NumbersSectionEn() {
  const STATS = [
    { n: "30", unit: "s", l: "Leader median time-to-decision. Diff is packed, checks are run, README is attached — all of it fits in the first screen." },
    { n: "0", unit: "ms", l: "Runtime network latency. The bundle is a local tgz. Claude Code never handshakes with the server after install." },
    { n: "60", unit: "s", l: "install-intent token lifetime. Paste it into a chat — won't work for anyone else. The token binds to device + time window." },
    { n: "1", unit: "box", l: "Servers needed to run the entire marketplace. A 4-core, 8GB machine. docker compose up." },
  ];
  return (
    <section className="section" id="numbers" style={{ background: "var(--bg-sunk)", borderTop: "1px solid var(--border)" }}>
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">V</span>
          <span className="chapter-label">By the numbers</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "18ch", marginBottom: 64 }}>
          Every number <em>is a design decision.</em>
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: 22 }}>
              <div className="stat-big">{s.n}<em>{s.unit}</em></div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSectionEn() {
  const ROWS = [
    ["Quality gate", { other: ["—", "—", "—"], sharon: "Leader review" }],
    ["Immutable versions", { other: ["—", "—", "❌"], sharon: "Cut on each approval" }],
    ["One-click install", { other: ["copy/paste", "copy/paste", "git clone"], sharon: "sharon:// + CLI" }],
    ["Uninstall/retention signal", { other: ["—", "—", "—"], sharon: "Flows to leader view" }],
    ["Discover → submit", { other: ["DM a screenshot", "drop a file", "open a PR"], sharon: "scanner auto-finds" }],
    ["Runtime dependency", { other: ["—", "—", "—"], sharon: "None (local tgz)" }],
    ["Self-hostable", { other: ["❌", "❌", "✓"], sharon: "✓ docker compose up" }],
  ];
  const OTHERS = ["Slack pins", "Notion docs", "Internal git"];

  return (
    <section className="section" id="compare">
      <div className="container">
        <div className="chapter">
          <span className="chapter-num">VII</span>
          <span className="chapter-label">Comparison</span>
          <span className="chapter-spacer" />
        </div>
        <h2 className="h-display" style={{ maxWidth: "18ch", marginBottom: 32 }}>
          Why not <em>what already exists</em>?
        </h2>
        <p className="lede" style={{ maxWidth: "60ch", marginBottom: 48, fontSize: 17 }}>
          Teams have tried to sediment AI best practices before. Slack pins, Notion pages, internal git. Sharon solves the layer none of them do: <strong style={{ color: "var(--ink)" }}>executable + versioned + quality-gated + with retention feedback</strong>.
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
                  <td key={j} className={v === "—" || v === "❌" ? "lose" : v.includes("copy") || v === "git clone" || v === "open a PR" || v === "drop a file" || v === "DM a screenshot" ? "warn" : "win"}>{v}</td>
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

function QuoteSectionEn() {
  return (
    <section className="section section-narrow" id="quote" style={{ background: "var(--ink)", color: "#fff", borderBottom: "none" }}>
      <div className="container" style={{ textAlign: "center", padding: "32px 24px" }}>
        <p className="pull-quote" style={{ color: "#fff", maxWidth: "26ch", margin: "0 auto" }}>
          We're not building another AI tool marketplace. We're keeping <em style={{ color: "var(--primary-soft)" }}>that one good skill that senior wrote</em> alive inside the team.
        </p>
        <div className="pull-attr" style={{ color: "rgba(255,255,255,0.5)", marginTop: 24 }}>libz · Sharon design doc</div>
      </div>
    </section>
  );
}

function MarqueeSectionEn() {
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
  HeroSectionEn: HeroSectionEn,
  PhasesSectionEn: PhasesSectionEn,
  AuthSectionEn: AuthSectionEn,
  BrowseSectionEn: BrowseSectionEn,
  SubmitSectionEn: SubmitSectionEn,
  ApprovalSectionEn: ApprovalSectionEn,
  InstallSectionEn: InstallSectionEn,
  PushSectionEn: PushSectionEn,
  LivePrototypeSectionEn: LivePrototypeSectionEn,
  CLISectionEn: CLISectionEn,
  ArchitectureSectionEn: ArchitectureSectionEn,
  CTASectionEn: CTASectionEn,
  FooterSectionEn: FooterSectionEn,
  ProblemSectionEn: ProblemSectionEn,
  ManifestoSectionEn: ManifestoSectionEn,
  NumbersSectionEn: NumbersSectionEn,
  ComparisonSectionEn: ComparisonSectionEn,
  QuoteSectionEn: QuoteSectionEn,
  MarqueeSectionEn: MarqueeSectionEn,
});
