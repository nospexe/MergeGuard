"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Moon, Search, Rocket } from "lucide-react";
import Button from "@/components/shared/Button";

export default function Topnav() {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith("/dashboard");

    return (
        <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b-[0.5px] border-glass-border bg-topnav-bg backdrop-blur-topnav">
            <div className="flex w-full items-center justify-between px-6">
                {/* Left — Brand */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/20 border border-blue-border">
                        <Rocket className="h-4 w-4 text-blue" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-text-1 tracking-tight">
                            MergeGuard
                        </span>
                        <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-text-3">
                            Enterprise Intelligence
                        </span>
                    </div>
                </Link>

                {/* Center */}
                {isDashboard ? (
                    <div className="hidden md:flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3 py-1.5 w-80">
                        <Search className="h-3.5 w-3.5 text-text-3" />
                        <input
                            type="text"
                            placeholder="Search PRs, symbols, patterns…"
                            className="w-full bg-transparent text-[13px] text-text-2 placeholder:text-text-3 outline-none"
                        />
                    </div>
                ) : (
                    <nav className="hidden md:flex items-center gap-8">
                        {["Docs", "Pricing", "Changelog"].map((item) => (
                            <Link
                                key={item}
                                href="#"
                                className="text-sm text-text-2 transition-colors duration-150 hover:text-text-1"
                            >
                                {item}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Right */}
                <div className="flex items-center gap-3">
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-glass hover:text-text-2">
                        <Moon className="h-4 w-4" />
                    </button>
                    <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-glass hover:text-text-2">
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red" />
                    </button>
                    {isDashboard ? (
                        <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-2 py-1">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue to-purple" />
                            <span className="text-[12px] font-medium text-text-2 hidden sm:block">Admin</span>
                        </div>
                    ) : (
                        <Link href="/dashboard">
                            <Button variant="primary" size="sm">
                                Deploy Sentinel
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
