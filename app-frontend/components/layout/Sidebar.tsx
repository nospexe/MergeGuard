"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Clock,
  Settings,
  HelpCircle,
  Code2,
  Plus,
  FlaskConical,
  History,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Analysis", href: "/analyze", icon: FlaskConical },
  { label: "History", href: "/history", icon: History },
  { label: "Blast Radius", href: "/dashboard/blast-radius", icon: Target },
  { label: "PostMortem", href: "/dashboard/postmortem", icon: Clock },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = () => {
    window.location.href = "/";
  };

  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-56px)] w-60 flex-col border-r-[0.5px] border-[rgba(255,255,255,0.06)] bg-[rgba(10,11,13,0.95)] backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[rgba(248,250,252,0.25)]">
          Navigation
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-[2px]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[rgba(0,212,255,0.08)] border-[0.5px] border-[rgba(0,212,255,0.2)] text-[#00d4ff]"
                  : "text-[rgba(248,250,252,0.5)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(248,250,252,0.8)]"
              )}
            >
              <Icon
                className={cn(
                  "h-[14px] w-[14px]",
                  isActive ? "text-[#00d4ff]" : "text-[rgba(248,250,252,0.3)]"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-4 space-y-2">
        <Link
          href="#"
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[rgba(248,250,252,0.3)] hover:text-[rgba(248,250,252,0.6)] transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Support
        </Link>
        <Link
          href="#"
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[rgba(248,250,252,0.3)] hover:text-[rgba(248,250,252,0.6)] transition-colors"
        >
          <Code2 className="h-3.5 w-3.5" />
          API
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[rgba(248,250,252,0.3)] hover:text-[#ff6666] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
        <Link
          href="/analyze"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00d4ff] py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_16px_rgba(0,212,255,0.25)]"
        >
          <Plus className="h-3 w-3" />
          New Analysis
        </Link>
      </div>
    </aside>
  );
}
