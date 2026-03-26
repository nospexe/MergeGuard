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
} from "lucide-react";
import { cn } from "@/lib/cn";
import Button from "@/components/shared/Button";

const navIconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="h-[14px] w-[14px]" />,
    Target: <Target className="h-[14px] w-[14px]" />,
    Clock: <Clock className="h-[14px] w-[14px]" />,
    Settings: <Settings className="h-[14px] w-[14px]" />,
};

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Blast Radius", href: "/dashboard/blast-radius", icon: "Target" },
    { label: "PostMortem", href: "/dashboard/postmortem", icon: "Clock" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-56px)] w-60 flex-col border-r-[0.5px] border-glass-border bg-sidebar-bg backdrop-blur-sidebar">
            {/* Header */}
            <div className="px-4 pt-5 pb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-3">
                    MergeGuard
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-[2px]">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
                                isActive
                                    ? "bg-blue-dim border-[0.5px] border-blue-border text-blue-text"
                                    : "text-text-2 hover:bg-glass-hover hover:text-text-1",
                            )}
                        >
                            <span className={cn(isActive ? "text-blue-text" : "text-text-3")}>
                                {navIconMap[item.icon]}
                            </span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="border-t border-glass-border px-3 py-4 space-y-2">
                <Link
                    href="#"
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-3 hover:text-text-2 transition-colors"
                >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Support
                </Link>
                <Link
                    href="#"
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-3 hover:text-text-2 transition-colors"
                >
                    <Code2 className="h-3.5 w-3.5" />
                    API
                </Link>
                <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-[10px] font-bold uppercase tracking-[0.12em]"
                >
                    <Plus className="h-3 w-3" />
                    New Analysis
                </Button>
            </div>
        </aside>
    );
}
