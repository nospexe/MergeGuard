"use client";

import { cn } from "@/lib/cn";
import type { ButtonVariant, ButtonSize } from "@/lib/types";
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";

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

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
    className?: string;
    href?: string;
};

export default function Button({
    variant = "primary",
    size = "md",
    children,
    className,
    href,
    ...props
}: ButtonProps) {
    const baseClasses = cn(
        "inline-flex items-center justify-center gap-2 rounded-[7px] font-sans font-medium transition-all duration-150 active:scale-[0.98] focus-visible:shadow-focus outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        className,
    );

    if (href) {
        if (href.startsWith("http")) {
            return (
                <a href={href} className={baseClasses} target="_blank" rel="noopener noreferrer" {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
                    {children}
                </a>
            );
        }
        return (
            <Link href={href} className={baseClasses} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
                {children}
            </Link>
        );
    }

    return (
        <button className={baseClasses} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
            {children}
        </button>
    );
}
