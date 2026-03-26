"use client";

import { cn } from "@/lib/cn";
import type { BadgeVariant } from "@/lib/types";

const variantStyles: Record<BadgeVariant, string> = {
    critical: "bg-red-dim text-red border-red-border",
    warning: "bg-amber-dim text-amber border-amber-border",
    passed: "bg-green-dim text-green border-green-border",
    info: "bg-blue-dim text-blue border-blue-border",
    scanning: "bg-blue-dim text-blue border-blue-border",
};

interface BadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    className?: string;
    dot?: boolean;
}

export default function Badge({ variant, children, className, dot = true }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-pill border-[0.5px] px-[9px] py-[3px] text-[11px] font-semibold",
                variantStyles[variant],
                variant === "scanning" && "animate-pulse",
                className,
            )}
        >
            {dot && <span className="h-[5px] w-[5px] rounded-full bg-current" />}
            {children}
        </span>
    );
}
