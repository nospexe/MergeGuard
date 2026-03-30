"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Shield } from "lucide-react";

export default function Topnav() {
  const pathname = usePathname();
  const isApp = pathname.startsWith("/dashboard") || pathname.startsWith("/analyze") || pathname.startsWith("/history");

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b-[0.5px] border-[rgba(255,255,255,0.06)] bg-[rgba(10,11,13,0.85)] backdrop-blur-xl">
      <div className="flex w-full items-center justify-between px-6">
        {/* Left — Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)]">
            <Shield className="h-3.5 w-3.5 text-[#00d4ff]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-[#f8fafc] tracking-tight">
              MergeGuard
            </span>
            <span className="text-[8px] font-mono font-medium uppercase tracking-[0.15em] text-[rgba(248,250,252,0.25)]">
              Pre-Merge Intelligence
            </span>
          </div>
        </Link>

        {/* Center */}
        {isApp ? (
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 w-80">
            <Search className="h-3.5 w-3.5 text-[rgba(248,250,252,0.25)]" />
            <input
              type="text"
              placeholder="Search PRs, symbols, patterns…"
              className="w-full bg-transparent text-[12px] text-[rgba(248,250,252,0.6)] placeholder:text-[rgba(248,250,252,0.2)] outline-none font-mono"
            />
          </div>
        ) : (
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Docs", href: "#" },
              { label: "GitHub", href: "https://github.com/nospexe/MergeGuard" },
              { label: "Changelog", href: "#" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[13px] text-[rgba(248,250,252,0.4)] transition-colors duration-150 hover:text-[rgba(248,250,252,0.8)]"
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[rgba(248,250,252,0.3)] transition-colors hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(248,250,252,0.6)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ff4444]" />
          </button>
          {isApp ? (
            <div className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#00ff88]" />
              <span className="text-[11px] font-mono font-medium text-[rgba(248,250,252,0.5)] hidden sm:block">
                demo@user
              </span>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-md bg-[#00d4ff] px-4 py-1.5 text-[12px] font-semibold text-[#0a0b0d] transition-all hover:bg-[#00bfe8]"
            >
              Try Demo
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
