"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Shield,
  GitBranch,
  Terminal,
  Zap,
  Clock,
  Target,
  Brain,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import MergeRecommendationBadge from "@/components/MergeRecommendationBadge";

/* ─── GitHub SVG Icon (not in lucide-react v1.7+) ──────────── */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ─── Scroll-reveal hook ─────────────────────────────────── */

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Animated Risk Badge Demo ───────────────────────────── */

function AnimatedBadgeDemo() {
  const levels = ["GREEN", "YELLOW", "RED"] as const;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <MergeRecommendationBadge level={levels[idx]} size="lg" animated />
      <div className="flex gap-2">
        {levels.map((level, i) => (
          <button
            key={level}
            onClick={() => setIdx(i)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i === idx ? "scale-150" : "opacity-40"
            }`}
            style={{
              background:
                level === "GREEN"
                  ? "#00ff88"
                  : level === "YELLOW"
                  ? "#ffaa22"
                  : "#ff4444",
            }}
            aria-label={`Show ${level} risk level`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Scanline Overlay ─────────────────────────────────────── */

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03]"
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(255,255,255,0.08) 2px,
          rgba(255,255,255,0.08) 4px
        )`,
      }}
    />
  );
}

/* ─── Noise Texture ────────────────────────────────────────── */

function NoiseTexture() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[99] opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

/* ─── Terminal Code Block ──────────────────────────────────── */

const TERMINAL_LINES = [
  "$ mergeguard analyze --repo django/django --branch feature/cache-refactor",
  "",
  "⟐ Scanning repository...",
  "⟐ Building dependency graph... 23 files mapped",
  "⟐ Running blast radius analysis...",
  "  → Ring 0: base.py (12% coverage) ▓▓░░░░░░░░",
  "  → Ring 1: 5 backends affected    ▓▓▓░░░░░░░",
  "  → Ring 2: sessions, middleware    ▓▓▓▓░░░░░░",
  "  → Ring 3: throttling, celery      ▓▓▓▓▓░░░░░",
  "",
  "⟐ Mining PostMortem patterns...",
  "  → Pattern P-004 matched (74% confidence)",
  "  → 6 historical incidents found",
  "",
  "⟐ Running 3-agent LLM pipeline...",
  "  → Agent 1: Blast Interpreter ✓",
  "  → Agent 2: Pattern Explainer ✓",
  "  → Agent 3: Orchestrator      ✓",
  "",
  "┌─────────────────────────────────┐",
  "│  VERDICT: 🔴 BLOCK MERGE       │",
  "│  Risk Score: 87/100             │",
  "│  Affected Files: 23             │",
  "│  Pattern Match: P-004 (74%)     │",
  "└─────────────────────────────────┘",
];

function getLineColor(line: string): string {
  if (line.includes("BLOCK MERGE")) return "#ff4444";
  if (line.includes("✓")) return "#00ff88";
  if (line.startsWith("$")) return "#00d4ff";
  if (line.startsWith("⟐")) return "#ffaa22";
  if (line.startsWith("  →")) return "#94a3b8";
  if (line.includes("─") || line.includes("│")) return "#00ff88";
  return "rgba(248,250,252,0.5)";
}

function TerminalBlock() {
  const [lines, setLines] = useState<string[]>([]);
  const idxRef = useRef(0);

  useEffect(() => {
    // Reset on mount (handles StrictMode double-fire)
    idxRef.current = 0;
    setLines([]);

    const timer = setInterval(() => {
      if (idxRef.current < TERMINAL_LINES.length) {
        const currentLine = TERMINAL_LINES[idxRef.current] ?? "";
        idxRef.current += 1;
        setLines((prev) => [...prev, currentLine]);
      } else {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-2xl rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0a0b0d] overflow-hidden shadow-2xl shadow-cyan-500/5">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-[10px] font-mono text-[rgba(255,255,255,0.3)]">
          mergeguard — terminal
        </span>
      </div>
      {/* Terminal content */}
      <div className="p-4 font-mono text-[11px] leading-relaxed h-[340px] overflow-hidden">
        {lines.map((line, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{ color: getLineColor(line) }}
          >
            {line || "\u00A0"}
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-[#00d4ff] animate-blink" />
      </div>
    </div>
  );
}

/* ─── Section Wrapper ──────────────────────────────────────── */

function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative py-24 px-6 md:px-12 ${className}`}
    >
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

/* ─── Tech Chip ─────────────────────────────────────────────── */

function TechChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] px-3 py-1 text-[11px] font-mono text-[#00d4ff] transition-all hover:border-[rgba(0,212,255,0.4)] hover:bg-[rgba(0,212,255,0.1)]">
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <>
      <ScanlineOverlay />
      <NoiseTexture />

      {/* ── Nav ── */}
      <header className="fixed top-0 z-50 w-full border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,11,13,0.85)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)]">
              <Shield className="h-3.5 w-3.5 text-[#00d4ff]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-[#f8fafc]">
              MergeGuard
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {["Problem", "Engines", "How It Works", "Tech"].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[13px] text-[rgba(248,250,252,0.45)] hover:text-[rgba(248,250,252,0.8)] transition-colors"
              >
                {s}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/nospexe/MergeGuard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-[rgba(248,250,252,0.4)] hover:text-[rgba(248,250,252,0.7)] transition-colors"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
            <Link
              href="/dashboard"
              className="rounded-md bg-[#00d4ff] px-4 py-1.5 text-[12px] font-semibold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0b0d] pt-14">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, rgba(0,212,255,0.15), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(ellipse, rgba(0,255,136,0.2), transparent 70%)",
          }}
        />

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center px-6">
          <Reveal>
            <div className="mb-8 flex justify-center">
              <AnimatedBadgeDemo />
            </div>
          </Reveal>

          <Reveal delay={150}>
            <h1 className="font-mono text-[clamp(32px,6vw,64px)] font-bold leading-[1.05] tracking-tight">
              <span className="block text-[#f8fafc]">
                Know what breaks.
              </span>
              <span className="block text-[#f8fafc]">
                Know why it broke before.
              </span>
              <span className="block text-[#00d4ff] mt-1">
                Before you merge.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-[rgba(248,250,252,0.5)]">
              Open-source pre-merge intelligence that traces blast radius,
              mines historical failure patterns, and runs a 3-agent LLM pipeline
              — all before your PR hits production.
            </p>
          </Reveal>

          <Reveal delay={450}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 rounded-lg bg-[#00d4ff] px-8 py-3 text-[14px] font-bold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
              >
                Try the Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://github.com/nospexe/MergeGuard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] px-8 py-3 text-[14px] font-medium text-[rgba(248,250,252,0.6)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:text-[rgba(248,250,252,0.9)]"
              >
                <GithubIcon className="h-4 w-4" />
                View on GitHub
              </a>
            </div>
          </Reveal>

          <Reveal delay={600}>
            <div className="mt-16">
              <TerminalBlock />
            </div>
          </Reveal>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-5 w-5 text-[rgba(248,250,252,0.2)]" />
          </div>
        </div>
      </section>

      {/* ═══════ 2. THE PROBLEM ═══════ */}
      <Section id="problem" className="bg-[#0a0b0d]">
        <Reveal>
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff4444]">
              The Problem
            </span>
            <h2 className="mt-4 font-mono text-[clamp(24px,4vw,40px)] font-bold text-[#f8fafc]">
              The 2 AM Incident That Shouldn&apos;t Have Happened
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <Reveal delay={100}>
            <div className="space-y-6">
              {[
                {
                  time: "2:14 AM",
                  event: "PagerDuty fires. Production is down.",
                  color: "#ff4444",
                },
                {
                  time: "2:18 AM",
                  event:
                    'Someone pushed a "trivial" cache refactor. 23 files broke.',
                  color: "#ffaa22",
                },
                {
                  time: "2:47 AM",
                  event:
                    "The same file combination caused an outage 6 months ago. Nobody remembered.",
                  color: "#ff8800",
                },
                {
                  time: "4:02 AM",
                  event:
                    "Production restored. The team vows to never let this happen again.",
                  color: "#00ff88",
                },
                {
                  time: "Next quarter",
                  event: "It happens again.",
                  color: "#ff4444",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0 border-2"
                        style={{
                          borderColor: item.color,
                          background: `${item.color}20`,
                        }}
                      />
                      {i < 4 && (
                        <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" />
                      )}
                    </div>
                    <div>
                      <span
                        className="text-[11px] font-mono font-bold"
                        style={{ color: item.color }}
                      >
                        {item.time}
                      </span>
                      <p className="text-[14px] text-[rgba(248,250,252,0.6)] mt-0.5">
                        {item.event}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="rounded-xl border border-[rgba(255,68,68,0.15)] bg-[rgba(255,68,68,0.03)] p-8 text-center">
              <div className="text-[64px] font-mono font-black text-[#ff4444] leading-none">
                87%
              </div>
              <p className="mt-3 text-[14px] text-[rgba(248,250,252,0.5)]">
                of production incidents involve code changes that{" "}
                <strong className="text-[#f8fafc]">previously caused outages</strong> in
                similar file combinations.
              </p>
              <p className="mt-4 text-[12px] font-mono text-[rgba(248,250,252,0.3)]">
                Source: Internal analysis of 2,400+ postmortem reports
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ═══════ 3. TWO ENGINES ═══════ */}
      <Section id="engines" className="bg-[#080a0e]">
        <Reveal>
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#00d4ff]">
              Two Intelligence Engines
            </span>
            <h2 className="mt-4 font-mono text-[clamp(24px,4vw,40px)] font-bold text-[#f8fafc]">
              Spatial Impact × Temporal Patterns
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BlastRadius Engine */}
          <Reveal delay={100}>
            <div className="group rounded-xl border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.02)] p-8 transition-all hover:border-[rgba(0,212,255,0.25)] hover:bg-[rgba(0,212,255,0.04)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
                  <Target className="h-5 w-5 text-[#00d4ff]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold font-mono text-[#f8fafc]">
                    BlastRadius
                  </h3>
                  <p className="text-[11px] text-[rgba(248,250,252,0.4)]">
                    Spatial Impact Analysis
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-[rgba(248,250,252,0.55)] leading-relaxed mb-6">
                Traces every changed symbol through your entire dependency graph.
                Maps affected files across concentric rings — from the modified
                file outward through direct dependents, transitive imports, and
                extended consumers. Color-coded by test coverage.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Files Mapped", value: "23", color: "#00d4ff" },
                  { label: "Coverage", value: "38%", color: "#ff4444" },
                  { label: "Risk Score", value: "87", color: "#ff4444" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 text-center"
                  >
                    <p className="text-[9px] font-mono uppercase text-[rgba(248,250,252,0.3)]">
                      {m.label}
                    </p>
                    <p
                      className="text-[20px] font-mono font-bold mt-0.5"
                      style={{ color: m.color }}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* PostMortem Engine */}
          <Reveal delay={200}>
            <div className="group rounded-xl border border-[rgba(0,255,136,0.12)] bg-[rgba(0,255,136,0.02)] p-8 transition-all hover:border-[rgba(0,255,136,0.25)] hover:bg-[rgba(0,255,136,0.04)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
                  <Clock className="h-5 w-5 text-[#00ff88]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold font-mono text-[#f8fafc]">
                    PostMortem
                  </h3>
                  <p className="text-[11px] text-[rgba(248,250,252,0.4)]">
                    Temporal Pattern Mining
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-[rgba(248,250,252,0.55)] leading-relaxed mb-6">
                Mines your git history to find recurring failure fingerprints.
                Uses frequent itemset mining (mlxtend/FP-Growth) to identify
                file combinations that historically co-occur in incident-causing
                commits. Matches current PR against the fingerprint database.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Patterns", value: "3", color: "#00ff88" },
                  { label: "Confidence", value: "74%", color: "#ffaa22" },
                  { label: "Incidents", value: "11", color: "#ff8800" },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 text-center"
                  >
                    <p className="text-[9px] font-mono uppercase text-[rgba(248,250,252,0.3)]">
                      {m.label}
                    </p>
                    <p
                      className="text-[20px] font-mono font-bold mt-0.5"
                      style={{ color: m.color }}
                    >
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ═══════ 4. HOW IT WORKS ═══════ */}
      <Section id="how-it-works" className="bg-[#0a0b0d]">
        <Reveal>
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#00ff88]">
              How It Works
            </span>
            <h2 className="mt-4 font-mono text-[clamp(24px,4vw,40px)] font-bold text-[#f8fafc]">
              Point → Analyze → Decide
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: <GitBranch className="h-6 w-6" />,
              title: "Point",
              description:
                "Point MergeGuard at your repository and the branch you want to analyze. It extracts the diff and builds the dependency graph using Python AST and rope.",
              color: "#00d4ff",
            },
            {
              step: "02",
              icon: <Zap className="h-6 w-6" />,
              title: "Analyze",
              description:
                'BlastRadius maps structural impact. PostMortem mines failure patterns. A 3-agent LLM pipeline synthesizes both into a plain-English risk brief.',
              color: "#ffaa22",
            },
            {
              step: "03",
              icon: <Shield className="h-6 w-6" />,
              title: "Decide",
              description:
                "Get a clear GREEN / YELLOW / RED recommendation with specific action items. Block risky merges before they hit production.",
              color: "#00ff88",
            },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 150}>
              <div className="relative group">
                {/* Step number - large background */}
                <div
                  className="absolute -top-4 -left-2 text-[80px] font-mono font-black leading-none opacity-[0.04]"
                  style={{ color: item.color }}
                >
                  {item.step}
                </div>
                <div className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 transition-all hover:border-[rgba(255,255,255,0.12)]">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                    style={{
                      background: `${item.color}10`,
                      border: `1px solid ${item.color}25`,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-[18px] font-bold font-mono text-[#f8fafc] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-[rgba(248,250,252,0.5)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ═══════ 5. TECH STACK ═══════ */}
      <Section id="tech" className="bg-[#080a0e]">
        <Reveal>
          <div className="text-center mb-12">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[rgba(248,250,252,0.3)]">
              Built With
            </span>
            <h2 className="mt-4 font-mono text-[clamp(24px,4vw,36px)] font-bold text-[#f8fafc]">
              Production-Grade Open Source Stack
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Python AST",
              "rope",
              "mlxtend",
              "FP-Growth",
              "D3.js v7",
              "FastAPI",
              "Next.js 14",
              "Convex",
              "Claude claude-sonnet-4-20250514",
              "Recharts",
              "Tailwind CSS",
              "TypeScript",
            ].map((tech) => (
              <TechChip key={tech} label={tech} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Terminal className="h-5 w-5" />, label: "100% Offline Capable", desc: "No API keys required for core analysis" },
              { icon: <Shield className="h-5 w-5" />, label: "MIT Licensed", desc: "Free forever, no vendor lock-in" },
              { icon: <Brain className="h-5 w-5" />, label: "3-Agent LLM", desc: "Sequential reasoning pipeline" },
              { icon: <Zap className="h-5 w-5" />, label: "Real-Time", desc: "Token-by-token streaming" },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 text-center"
              >
                <div className="flex justify-center mb-2 text-[#00d4ff]">
                  {item.icon}
                </div>
                <p className="text-[12px] font-semibold text-[#f8fafc] mb-0.5">
                  {item.label}
                </p>
                <p className="text-[10px] text-[rgba(248,250,252,0.4)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ═══════ 6. FOSS COMMITMENT ═══════ */}
      <Section className="bg-[#0a0b0d]">
        <Reveal>
          <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.02)] p-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.08)] px-4 py-1.5 mb-6">
              <Shield className="h-3.5 w-3.5 text-[#00ff88]" />
              <span className="text-[11px] font-mono font-bold text-[#00ff88] uppercase tracking-wider">
                MIT License
              </span>
            </div>
            <h2 className="font-mono text-[clamp(20px,3vw,32px)] font-bold text-[#f8fafc] mb-4">
              Free. Open Source. No Strings.
            </h2>
            <p className="max-w-lg mx-auto text-[14px] text-[rgba(248,250,252,0.5)] leading-relaxed">
              MergeGuard is built for FOSS Hack 2026. No subscriptions, no API
              key requirements for core functionality, no vendor lock-in. Your
              code stays on your machine. Your analysis stays private.
            </p>
            <div className="mt-8 flex items-center justify-center gap-6 text-[12px] font-mono text-[rgba(248,250,252,0.35)]">
              <span>✓ Offline-first</span>
              <span>✓ No telemetry</span>
              <span>✓ Self-hostable</span>
              <span>✓ Community-driven</span>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ═══════ 7. CTA ═══════ */}
      <Section className="bg-[#080a0e]">
        <Reveal>
          <div className="text-center">
            <h2 className="font-mono text-[clamp(24px,4vw,44px)] font-bold text-[#f8fafc] mb-4">
              Stop merging blind.
            </h2>
            <p className="max-w-md mx-auto text-[15px] text-[rgba(248,250,252,0.5)] mb-10">
              See what MergeGuard catches in 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 rounded-lg bg-[#00d4ff] px-10 py-3.5 text-[15px] font-bold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_40px_rgba(0,212,255,0.4)]"
              >
                Try the Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="https://github.com/nospexe/MergeGuard"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] px-10 py-3.5 text-[15px] font-medium text-[rgba(248,250,252,0.6)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:text-[rgba(248,250,252,0.9)]"
              >
                <GithubIcon className="h-4 w-4" />
                View on GitHub
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[#0a0b0d] px-6 py-8">
        <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#00d4ff]" />
            <span className="text-[13px] font-bold text-[#f8fafc]">
              MergeGuard
            </span>
            <span className="text-[10px] text-[rgba(248,250,252,0.3)]">
              © 2026 · FOSS Hack
            </span>
          </div>
          <div className="flex items-center gap-6">
            {[
              {
                label: "MIT License",
                href: "https://github.com/nospexe/MergeGuard/blob/main/LICENSE",
              },
              {
                label: "GitHub",
                href: "https://github.com/nospexe/MergeGuard",
              },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[rgba(248,250,252,0.3)] hover:text-[rgba(248,250,252,0.6)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
