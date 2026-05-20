// App entry — top nav, persona, language toggle, Tweaks integration, mount sections
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const NAV_ITEMS_ZH = [
  { id: "overview", label: "概览" },
  { id: "principles", label: "原则" },
  { id: "browse", label: "浏览" },
  { id: "approval", label: "审批" },
  { id: "install", label: "安装" },
  { id: "push", label: "推送" },
  { id: "compare", label: "对比" },
  { id: "live", label: "试用" },
  { id: "arch", label: "架构" },
];

const NAV_ITEMS_EN = [
  { id: "overview", label: "Overview" },
  { id: "principles", label: "Principles" },
  { id: "browse", label: "Browse" },
  { id: "approval", label: "Approve" },
  { id: "install", label: "Install" },
  { id: "push", label: "Push" },
  { id: "compare", label: "Compare" },
  { id: "live", label: "Try it" },
  { id: "arch", label: "Stack" },
];

const STRINGS = {
  zh: {
    member: "成员", leader: "组长",
    themeSection: "主题", modeLabel: "模式", lightLabel: "浅色", darkLabel: "深色",
    accentLabel: "主色",
    personaSection: "演示视角", personaLabel: "身份",
    langSection: "语言", langLabel: "语言",
  },
  en: {
    member: "Member", leader: "Leader",
    themeSection: "Theme", modeLabel: "Mode", lightLabel: "Light", darkLabel: "Dark",
    accentLabel: "Accent",
    personaSection: "Demo persona", personaLabel: "Role",
    langSection: "Language", langLabel: "Lang",
  },
};

function TopNav({ active, persona, setPersona, lang, setLang }) {
  const nav = lang === "en" ? NAV_ITEMS_EN : NAV_ITEMS_ZH;
  const s = STRINGS[lang];
  return (
    <div className="topnav">
      <div className="topnav-inner">
        <a href="#overview" className="brand" style={{ color: "var(--ink)", textDecoration: "none" }}>
          <div className="brand-mark"><span>S</span></div>
          <span>Matrix-Sharon</span>
          <span className="badge" style={{ marginLeft: 6 }}>v1</span>
        </a>
        <div className="nav-links" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
          {nav.map(n => (
            <button
              key={n.id}
              className={`nav-link ${active === n.id ? "active" : ""}`}
              onClick={() => document.getElementById(n.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >{n.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="Matrix-Sharon-Pitch.html" className="btn btn-sm" style={{ textDecoration: "none" }}>
            {lang === "en" ? "Pitch" : "Pitch 页"} <IconArrowRight size={12} />
          </a>
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            title={lang === "zh" ? "Switch to English" : "切换到中文"}
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-elev)",
              color: "var(--ink)",
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--ink)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <span style={{ opacity: lang === "zh" ? 1 : 0.4 }}>中</span>
            <span style={{ color: "var(--muted-2)", fontSize: 10 }}>/</span>
            <span style={{ opacity: lang === "en" ? 1 : 0.4 }}>EN</span>
          </button>
          <div className="persona-pill">
            <button className={persona === "member" ? "active" : ""} onClick={() => setPersona("member")}>{s.member}</button>
            <button className={persona === "leader" ? "active" : ""} onClick={() => setPersona("leader")}>{s.leader}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#5b5bd6",
  "lang": "zh"
}/*EDITMODE-END*/;

function App() {
  const [persona, setPersona] = useStateA("member");
  const [active, setActive] = useStateA("overview");
  const [tweaks, setTweak] = (typeof useTweaks === "function") ? useTweaks(DEFAULT_TWEAKS) : [DEFAULT_TWEAKS, () => {}];
  const lang = tweaks.lang === "en" ? "en" : "zh";
  const setLang = (v) => setTweak("lang", v);
  const s = STRINGS[lang];

  // theme + accent applied to root
  useEffectA(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme || "light");
    if (tweaks.accent) {
      document.documentElement.style.setProperty("--primary", tweaks.accent);
      document.documentElement.style.setProperty("--rose", tweaks.accent);
    }
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
    document.title = lang === "en"
      ? "Matrix-Sharon · Team skill marketplace"
      : "Matrix-Sharon · 团队技能集市";
  }, [tweaks.theme, tweaks.accent, lang]);

  // scroll spy
  useEffectA(() => {
    const ids = NAV_ITEMS_ZH.map(n => n.id);
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [lang]);

  // Generic reveal: tag .section-head, .principle, .pkg-card, .pull-quote, .chapter as auto-reveal targets.
  useEffectA(() => {
    const sel = ".section-head, .principle, .pkg-card, .pull-quote, .chapter, .compare-table";
    return revealAll(sel);
  }, [lang]);

  // pick component set
  const C = lang === "en" ? {
    Hero: HeroSectionEn, Problem: ProblemSectionEn, Marquee: MarqueeSectionEn,
    Phases: PhasesSectionEn, Auth: AuthSectionEn, Manifesto: ManifestoSectionEn,
    Browse: BrowseSectionEn, Submit: SubmitSectionEn, Approval: ApprovalSectionEn,
    Numbers: NumbersSectionEn, Install: InstallSectionEn, Push: PushSectionEn,
    Comparison: ComparisonSectionEn, Live: LivePrototypeSectionEn, Quote: QuoteSectionEn,
    CLI: CLISectionEn, Arch: ArchitectureSectionEn, CTA: CTASectionEn, Footer: FooterSectionEn,
  } : {
    Hero: HeroSection, Problem: ProblemSection, Marquee: MarqueeSection,
    Phases: PhasesSection, Auth: AuthSection, Manifesto: ManifestoSection,
    Browse: BrowseSection, Submit: SubmitSection, Approval: ApprovalSection,
    Numbers: NumbersSection, Install: InstallSection, Push: PushSection,
    Comparison: ComparisonSection, Live: LivePrototypeSection, Quote: QuoteSection,
    CLI: CLISection, Arch: ArchitectureSection, CTA: CTASection, Footer: FooterSection,
  };

  return (
    <>
      <ScrollProgress />
      <TopNav active={active} persona={persona} setPersona={setPersona} lang={lang} setLang={setLang} />
      <main key={lang}>
        <C.Hero persona={persona} />
        <C.Problem />
        <C.Marquee />
        <C.Phases />
        <C.Auth />
        <C.Manifesto />
        <C.Browse />
        <C.Submit />
        <C.Approval persona={persona} setPersona={setPersona} />
        <C.Numbers />
        <C.Install />
        <C.Push persona={persona} setPersona={setPersona} />
        <C.Comparison />
        <C.Live persona={persona} setPersona={setPersona} />
        <C.Quote />
        <C.CLI />
        <C.Arch />
        <C.CTA />
        <C.Footer />
      </main>

      {typeof TweaksPanel === "function" && (
        <TweaksPanel title="Tweaks">
          <TweakSection label={s.langSection}>
            <TweakRadio label={s.langLabel} value={lang} onChange={v => setLang(v)} options={[
              { label: "中文", value: "zh" },
              { label: "English", value: "en" },
            ]} />
          </TweakSection>
          <TweakSection label={s.themeSection}>
            <TweakRadio label={s.modeLabel} value={tweaks.theme} onChange={v => setTweak("theme", v)} options={[
              { label: s.lightLabel, value: "light" },
              { label: s.darkLabel, value: "dark" },
            ]} />
            <TweakColor
              label={s.accentLabel}
              value={tweaks.accent}
              onChange={v => setTweak("accent", v)}
              options={["#5b5bd6", "#00a47c", "#0ea5e9", "#c67a00", "#c33d3d"]}
            />
          </TweakSection>
          <TweakSection label={s.personaSection}>
            <TweakRadio label={s.personaLabel} value={persona} onChange={v => setPersona(v)} options={[
              { label: s.member, value: "member" },
              { label: s.leader, value: "leader" },
            ]} />
          </TweakSection>
        </TweaksPanel>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
