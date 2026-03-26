"use client";

import { cn } from "@/lib/cn";
import type { ButtonVariant, ButtonSize } from "@/lib/types";
import type { ReactNode, ButtonHTMLAttributes } from "react";

const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-blue text-white hover:bg-[#2563EB]",
    secondary: "bg-glass border border-glass-border text-text-2 hover:text-text-1",
    ghost: "bg-transparent border border-glass-border text-text-3 hover:text-text-2 hover:border-white/[0.15]",
    danger: "bg-red-dim border border-red-border text-red hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-[11px] py-[5px] text-[11px]",
    md: "px-4 py-2 text-[13px]",
    lg: "px-6 py-[11px] text-[15px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
    className?: string;
}

export default function Button({
    variant = "primary",
    size = "md",
    children,
    className,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-[7px] font-sans font-medium transition-all duration-150 active:scale-[0.98] focus-visible:shadow-focus outline-none",
                variantClasses[variant],
                sizeClasses[size],
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
