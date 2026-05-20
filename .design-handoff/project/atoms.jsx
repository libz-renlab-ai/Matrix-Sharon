// Atoms + small shared components for Matrix-Sharon showcase
const { useState, useEffect, useRef, useMemo } = React;

// SVG icon helpers — keep tiny and consistent
const Icon = ({ children, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);
const IconCheck = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>;
const IconX = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>;
const IconArrowRight = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>;
const IconArrowDown = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>;
const IconUpload = (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>;
const IconSend = (p) => <Icon {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>;
const IconGithub = (p) => <Icon {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Icon>;
const IconTerminal = (p) => <Icon {...p}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></Icon>;
const IconStar = (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>;
const IconBolt = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>;
const IconUsers = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
const IconInbox = (p) => <Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
const IconPackage = (p) => <Icon {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Icon>;
const IconFile = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>;
const IconCopy = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>;

// Simple animated counter — used for retention numbers
function AnimatedNumber({ value, format = (v) => v.toFixed(0), duration = 600 }) {
  const [val, setVal] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = val;
    fromRef.current = from;
    const start = Date.now();
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const p = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (value - from) * e);
      if (p < 1) setTimeout(tick, 16);
    };
    tick();
    return () => { cancelled = true; };
  }, [value]);
  return <>{format(val)}</>;
}

// Avatar with initials
function Avatar({ handle, role, size = 28 }) {
  const initial = (handle || "?").replace("@", "").slice(0, 1).toUpperCase();
  const isLeader = role === "leader";
  const colors = {
    s: ["oklch(0.78 0.12 18)", "var(--rose-deep)"],
    c: ["oklch(0.82 0.10 145)", "oklch(0.42 0.14 145)"],
    v: ["oklch(0.82 0.08 245)", "oklch(0.42 0.14 245)"],
    r: ["oklch(0.82 0.10 75)", "oklch(0.42 0.14 75)"],
    l: ["oklch(0.82 0.08 290)", "oklch(0.42 0.14 290)"],
    n: ["oklch(0.86 0.04 60)", "oklch(0.42 0.04 60)"],
  };
  const [bg, fg] = colors[initial.toLowerCase()] || colors.n;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg,
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: size * 0.42,
      position: "relative", flexShrink: 0,
    }}>
      {initial}
      {isLeader && (
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 12, height: 12, borderRadius: "50%",
          background: "var(--blue)", border: "2px solid var(--bg-elev)",
          display: "grid", placeItems: "center",
        }}>
          <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}
    </div>
  );
}

// Typewriter line — used in terminal
function useTypewriter(lines, active, speed = 18) {
  const [out, setOut] = useState([]);
  const stopRef = useRef(false);
  const timerRef = useRef(null);
  const linesKey = Array.isArray(lines) ? lines.join("\n") : "";
  useEffect(() => {
    if (!active) { setOut([]); return; }
    stopRef.current = false;
    let i = 0, j = 0;
    let cur = [];
    setOut([]);
    const tick = () => {
      if (stopRef.current) return;
      if (i >= lines.length) { return; }
      const line = lines[i];
      if (j === 0) cur = [...cur, ""];
      if (j < line.length) {
        cur = [...cur.slice(0, -1), line.slice(0, j + 1)];
        setOut(cur);
        j++;
        timerRef.current = setTimeout(tick, speed);
      } else {
        i++; j = 0;
        timerRef.current = setTimeout(tick, 120);
      }
    };
    timerRef.current = setTimeout(tick, 200);
    return () => {
      stopRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, linesKey]);
  return { out };
}

Object.assign(window, {
  Icon, IconCheck, IconX, IconArrowRight, IconArrowDown, IconSearch,
  IconDownload, IconUpload, IconSend, IconShield, IconGithub, IconTerminal,
  IconStar, IconBolt, IconUsers, IconInbox, IconClock, IconPackage, IconFile, IconCopy,
  AnimatedNumber, Avatar, useTypewriter,
  PrototypeFrame, useReveal, revealAll, Reveal, RevealNumber, Kinetic, ScrollProgress, HeroBlob,
});

/* ---------------- Reveal-on-scroll ---------------- */
// Easing — cubic ease-out
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

// JS-driven reveal animation. Uses setTimeout-based stepping because in this
// sandboxed editor iframe, requestAnimationFrame fires once and stops (the
// animation timeline is frozen). setTimeout still runs reliably.
function playReveal(el, {
  fromOpacity = 0, toOpacity = 1,
  fromY = 24, toY = 0,
  duration = 850,
  delay = 0,
  easing = easeOutCubic,
  stepMs = 16,
} = {}) {
  if (!el) return;
  let cancelled = false;
  const begin = () => {
    if (cancelled) return;
    const startWall = Date.now();
    const tick = () => {
      if (cancelled || !el.isConnected) return;
      const elapsed = Date.now() - startWall;
      const p = Math.min(1, elapsed / duration);
      const t = easing(p);
      el.style.opacity = (fromOpacity + (toOpacity - fromOpacity) * t).toString();
      const ty = fromY + (toY - fromY) * t;
      el.style.transform = `translateY(${ty.toFixed(2)}px)`;
      if (p < 1) {
        setTimeout(tick, stepMs);
      } else {
        el.style.opacity = String(toOpacity);
        el.style.transform = toY === 0 ? "" : `translateY(${toY}px)`;
      }
    };
    tick();
  };
  if (delay > 0) setTimeout(begin, delay);
  else begin();
  return () => { cancelled = true; };
}

// Returns [ref, shown]. Uses IntersectionObserver + scroll listener + polling
// (each path can trip `shown`). All three are needed because sandboxed iframes
// can block some/all of them.
function useReveal({ rootMargin = "0px 0px -8% 0px", threshold = 0.12 } = {}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let done = false;
    const trip = () => {
      if (done) return;
      done = true;
      setShown(true);
    };
    const check = () => {
      if (done || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 1;
      if (r.top < vh * 0.92 && r.bottom > 0) trip();
    };
    let obs;
    try {
      if (typeof IntersectionObserver !== "undefined") {
        obs = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) trip(); });
        }, { rootMargin, threshold });
        obs.observe(el);
      }
    } catch (_) {}
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const intervalId = setInterval(() => { if (done) clearInterval(intervalId); else check(); }, 200);
    const t1 = setTimeout(check, 50);
    const t2 = setTimeout(check, 400);
    return () => {
      done = true;
      clearTimeout(t1); clearTimeout(t2); clearInterval(intervalId);
      if (obs) obs.disconnect();
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return [ref, shown];
}

// Global helper — apply .will-reveal first, then JS-animate when in view.
// JS-driven so it works in sandboxed iframes where CSS animations get stuck.
// Polls every 200ms instead of relying on scroll events (those don't fire
// in some sandboxed iframes either).
function revealAll(selector, opts = {}) {
  const { thresholdRatio = 0.92, duration = 850, fromY = 24 } = opts;
  const targets = Array.from(document.querySelectorAll(selector));
  targets.forEach((t) => {
    if (!t.classList.contains("revealed-played")) {
      t.classList.add("will-reveal");
      t.style.opacity = "0";
      t.style.transform = `translateY(${fromY}px)`;
    }
  });
  const remaining = new Set(targets);
  const trip = (el) => {
    if (!remaining.has(el)) return;
    el.classList.add("shown", "revealed-played");
    playReveal(el, { duration, fromY });
    remaining.delete(el);
  };
  const check = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight || 1;
    remaining.forEach((el) => {
      if (!el.isConnected) { remaining.delete(el); return; }
      const r = el.getBoundingClientRect();
      if (r.top < vh * thresholdRatio && r.bottom > 0) trip(el);
    });
    if (remaining.size === 0) stop();
  };
  const stop = () => {
    window.removeEventListener("scroll", check);
    window.removeEventListener("resize", check);
    if (intervalId) clearInterval(intervalId);
  };
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);
  // Poll because scroll events don't fire in some sandboxed iframes
  const intervalId = setInterval(check, 200);
  setTimeout(check, 50);
  setTimeout(check, 300);
  return stop;
}

// Wrap any block in <Reveal> to fade-up when scrolled into view.
// stagger=true also staggers direct children.
function Reveal({ children, className = "", stagger = false, style, as: As = "div" }) {
  const [ref, shown] = useReveal();
  const innerRef = useRef(null);
  useEffect(() => {
    if (!shown || !innerRef.current) return;
    if (stagger) {
      const kids = Array.from(innerRef.current.children);
      kids.forEach((k, i) => {
        k.style.opacity = "0";
        k.style.transform = "translateY(20px)";
        playReveal(k, { duration: 700, delay: i * 70, fromY: 20 });
      });
    } else {
      playReveal(innerRef.current, { duration: 900, fromY: 28 });
    }
  }, [shown, stagger]);
  // attach both refs
  const setRefs = (n) => { ref.current = n; innerRef.current = n; };
  const initialStyle = stagger ? {} : { opacity: 0, transform: "translateY(28px)" };
  return <As ref={setRefs} className={`${className}`} style={{ ...initialStyle, ...style }}>{children}</As>;
}

// Counter that counts from 0 → value when scrolled into view. Used for "by the numbers".
function RevealNumber({ value, format = (v) => Math.round(v).toString(), duration = 1400, suffix = "" }) {
  const [ref, shown] = useReveal({ threshold: 0.4 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!shown) return;
    const start = Date.now();
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(value * eased);
      if (p < 1) setTimeout(tick, 16);
    };
    tick();
    return () => { cancelled = true; };
  }, [shown, value, duration]);
  return <span ref={ref}>{format(val)}{suffix}</span>;
}

// Kinetic — split children text into per-word spans that stagger in.
function Kinetic({ children, className = "", style, as: As = "h2" }) {
  const [ref, shown] = useReveal({ threshold: 0.2 });
  const containerRef = useRef(null);
  let idx = 0;
  const walk = (node, key = 0) => {
    if (typeof node === "string") {
      const tokens = node.split(/(\s+)/);
      return tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok;
        const ki = idx++;
        return <span key={`${key}-${i}`} className="kword" data-ki={ki} style={{ display: "inline-block", opacity: 0, transform: "translateY(18px)" }}>{tok}</span>;
      });
    }
    if (Array.isArray(node)) return node.map((n, i) => walk(n, i));
    if (React.isValidElement(node)) {
      const inner = walk(node.props.children, key);
      return React.cloneElement(node, { key: `e-${key}`, children: inner });
    }
    return node;
  };
  const content = walk(children);

  // JS-animate each kword with stagger when shown becomes true.
  useEffect(() => {
    if (!shown || !containerRef.current) return;
    const kwords = containerRef.current.querySelectorAll(".kword");
    kwords.forEach((kw) => {
      const ki = parseInt(kw.dataset.ki || "0");
      playReveal(kw, { duration: 700, delay: ki * 60, fromY: 18 });
    });
  }, [shown]);

  const setRefs = (n) => { ref.current = n; containerRef.current = n; };
  return <As ref={setRefs} className={`kinetic ${shown ? "shown" : ""} ${className}`} style={style}>{content}</As>;
}

// Scroll progress bar at top of page
function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const update = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      const p = Math.max(0, Math.min(1, window.scrollY / max));
      if (ref.current) ref.current.style.width = `${p * 100}%`;
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const intervalId = setInterval(update, 150); // fallback for sandboxed iframes
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearInterval(intervalId);
    };
  }, []);
  return <div ref={ref} className="scroll-progress" />;
}

// Hero blob — cursor-following soft gradient. Wrap inside the hero-canvas card.
function HeroBlob() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    const onLeave = () => {
      el.style.setProperty("--mx", `${el.offsetWidth / 2}px`);
      el.style.setProperty("--my", `${el.offsetHeight / 2}px`);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    onLeave();
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
  return <div ref={ref} className="hero-blob" />;
}

// Embed the real prototype/index.html. Same-origin so we can poke its body.dataset.role
// + drive hashchange to switch pages. Optionally syncs back: if user clicks the
// in-iframe role-switch, onPersonaChange fires so the showcase's persona state follows.
function PrototypeFrame({ route = "/browse", persona = "member", onPersonaChange, height = 640, hideChrome = false, style }) {
  const ref = useRef(null);
  const personaRef = useRef(persona);
  personaRef.current = persona;
  const onPersonaChangeRef = useRef(onPersonaChange);
  onPersonaChangeRef.current = onPersonaChange;
  const hideChromeRef = useRef(hideChrome);
  hideChromeRef.current = hideChrome;

  // First-mount wiring: attach load handler that does the role sync + listener install.
  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    const wireUp = () => {
      try {
        const doc = f.contentDocument;
        if (!doc || !doc.body) return;
        // Apply role
        doc.body.dataset.role = personaRef.current;
        doc.querySelectorAll("#role-switch button").forEach(b => {
          b.classList.toggle("active", b.dataset.role === personaRef.current);
        });
        // Bridge back: clicks on the in-iframe role switch update parent persona
        const sw = doc.getElementById("role-switch");
        if (sw && !sw.dataset.bridged) {
          sw.dataset.bridged = "1";
          sw.addEventListener("click", (e) => {
            const t = e.target;
            if (t && t.tagName === "BUTTON" && t.dataset.role) {
              onPersonaChangeRef.current && onPersonaChangeRef.current(t.dataset.role);
            }
          });
        }
        // Tone down iframe chrome — drop the page padding-top so the embed sits flush
        if (hideChromeRef.current) {
          const tb = doc.querySelector(".topbar");
          if (tb) tb.style.display = "none";
          const cont = doc.querySelector(".container");
          if (cont) cont.style.paddingTop = "20px";
        }
      } catch (_) { /* cross-origin or pre-load */ }
    };
    f.addEventListener("load", wireUp);
    wireUp(); // also run now in case already loaded
    return () => f.removeEventListener("load", wireUp);
  }, []);

  // Push persona prop changes into the iframe
  useEffect(() => {
    const f = ref.current;
    try {
      const doc = f && f.contentDocument;
      if (!doc || !doc.body) return;
      doc.body.dataset.role = persona;
      doc.querySelectorAll("#role-switch button").forEach(b => {
        b.classList.toggle("active", b.dataset.role === persona);
      });
      // Some pages need a refresh after role change — trigger the prototype's router
      try {
        const hash = doc.defaultView.location.hash;
        doc.defaultView.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: "", newURL: hash }));
      } catch (_) {}
    } catch (_) {}
  }, [persona]);

  // Push route prop changes into the iframe
  useEffect(() => {
    const f = ref.current;
    try {
      const w = f && f.contentWindow;
      if (!w) return;
      const target = "#" + (route.startsWith("/") ? route : "/" + route);
      if (w.location.hash !== target) {
        w.location.hash = target;
      }
    } catch (_) {}
  }, [route]);

  return (
    <iframe
      ref={ref}
      src={`prototype/index.html#${route.startsWith("/") ? route : "/" + route}`}
      title="Matrix-Sharon prototype"
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        display: "block",
        ...(style || {}),
      }}
    />
  );
}
