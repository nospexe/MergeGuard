"use client";

import Link from "next/link";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import { ArrowRight, BookOpen } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-6">
            {/* Ambient Orbs */}
            <div
                className="pointer-events-none absolute -right-12 -top-24 h-[400px] w-[400px] rounded-full opacity-35"
                style={{ background: "#3B82F6", filter: "blur(80px)" }}
            />
            <div
                className="pointer-events-none absolute -bottom-12 left-24 h-[300px] w-[300px] rounded-full opacity-20"
                style={{ background: "#8B5CF6", filter: "blur(60px)" }}
            />

            {/* Content */}
            <div className="relative z-10 mx-auto max-w-3xl text-center">
                {/* Status pill */}
                <div className="mb-8 flex justify-center">
                    <Badge variant="passed" className="text-[11px]">
                        System Status: Nominal
                    </Badge>
                </div>

                {/* Headline */}
                <h1 className="text-display leading-[1.05]">
                    <span className="block text-text-1">Know what breaks.</span>
                    <span
                        className="block bg-clip-text text-transparent"
                        style={{
                            backgroundImage: "linear-gradient(135deg, #60A5FA, #A78BFA)",
                        }}
                    >
                        Before you merge.
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="mx-auto mt-6 max-w-[480px] text-lg text-text-2">
                    AI-powered blast radius analysis that catches dependency risks,
                    logic bombs, and architectural regressions before they hit production.
                </p>

                {/* CTA Row */}
                <div className="mt-10 flex items-center justify-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="primary" size="lg">
                            Deploy Sentinel Now
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="#">
                        <Button variant="ghost" size="lg">
                            <BookOpen className="h-4 w-4" />
                            View Docs
                        </Button>
                    </Link>
                </div>

                {/* Dashboard Preview */}
                <div className="mt-16 rounded-2xl border-[0.5px] border-glass-border bg-glass p-1 overflow-hidden">
                    <div className="rounded-xl bg-bg-raised p-4">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                                { label: "Active PRs", value: "42", color: "text-[#60A5FA]" },
                                { label: "Critical", value: "7", color: "text-red" },
                                { label: "Confidence", value: "98.4%", color: "text-text-1" },
                            ].map((m) => (
                                <div
                                    key={m.label}
                                    className="rounded-panel border-[0.5px] border-glass-border bg-glass p-3"
                                >
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-3">
                                        {m.label}
                                    </p>
                                    <p className={`mt-1 text-2xl font-bold ${m.color}`}>
                                        {m.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {[82, 12, 44, 8].map((v, i) => (
                                <div
                                    key={i}
                                    className="flex-1 rounded-lg border-[0.5px] border-glass-border bg-glass px-3 py-2 flex items-center gap-2"
                                >
                                    <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-blue/50"
                                            style={{ width: `${v}%` }}
                                        />
                                    </div>
                                    <span className="font-mono text-[10px] text-text-3">{v}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
