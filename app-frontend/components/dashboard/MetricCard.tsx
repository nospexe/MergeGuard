"use client";

import { cn } from "@/lib/cn";
import type { MetricCardData } from "@/lib/types";

const colorMap: Record<string, string> = {
    blue: "text-[#60A5FA]",
    red: "text-red",
    green: "text-green",
    default: "text-text-1",
};

export default function MetricCard({ label, value, sub, color = "default" }: MetricCardData) {
    return (
        <div className="group rounded-panel border-[0.5px] border-glass-border bg-white/[0.03] p-4 transition-[border-color] duration-150 hover:border-white/[0.15]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                {label}
            </p>
            <p className={cn("mt-1 text-[36px] font-bold leading-none", colorMap[color])}>
                {value}
            </p>
            {sub && (
                <p className="mt-1 text-[11px] text-text-3">{sub}</p>
            )}
        </div>
    );
}
