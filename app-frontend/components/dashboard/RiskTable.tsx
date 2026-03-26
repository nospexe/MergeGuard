"use client";

import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import type { RiskItem } from "@/lib/types";
import { cn } from "@/lib/cn";

const barColorMap: Record<string, string> = {
    critical: "bg-red",
    warning: "bg-amber",
    passed: "bg-green",
};

interface RiskTableProps {
    items: RiskItem[];
}

export default function RiskTable({ items }: RiskTableProps) {
    const passedCount = items.filter((i) => i.verdict === "passed").length;
    const cautionCount = items.length - passedCount;

    return (
        <GlassCard className="flex-1" padding="p-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                    Risk Assessment Queue
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-green font-medium">
                        {String(passedCount).padStart(2, "0")} Safe
                    </span>
                    <span className="text-[11px] text-amber font-medium">
                        {String(cautionCount).padStart(2, "0")} Caution
                    </span>
                </div>
            </div>

            {/* Rows */}
            <div className="space-y-[2px] p-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="group flex items-center gap-3 rounded-lg border-[0.5px] border-glass-border bg-glass px-3 py-2.5 transition-all duration-150 hover:border-white/[0.15] hover:bg-glass-hover cursor-pointer"
                    >
                        {/* PR ID */}
                        <span className="min-w-[70px] font-mono text-[11px] text-text-3">
                            {item.id}
                        </span>

                        {/* Risk Bar */}
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    barColorMap[item.verdict],
                                )}
                                style={{ width: `${item.magnitude}%` }}
                            />
                        </div>

                        {/* Summary */}
                        <span className="flex-[2] truncate text-[12px] text-text-2">
                            {item.summary}
                        </span>

                        {/* Badge */}
                        <Badge variant={item.verdict}>{item.verdict}</Badge>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}
