"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    padding?: string;
    hover?: boolean;
}

export default function GlassCard({
    children,
    className,
    padding = "p-4",
    hover = false,
}: GlassCardProps) {
    return (
        <div
            className={cn(
                "rounded-card border-[0.5px] border-glass-border bg-glass transition-[border-color] duration-150",
                hover && "hover:border-white/[0.15] hover:-translate-y-0.5 hover:bg-glass-hover",
                padding,
                className,
            )}
        >
            {children}
        </div>
    );
}
