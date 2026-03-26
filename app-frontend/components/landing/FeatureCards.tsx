"use client";

import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import { featureCards } from "@/lib/mock-data";
import { BarChart2, Brain, Clock } from "lucide-react";
import type { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
    BarChart2: <BarChart2 className="h-5 w-5" />,
    Brain: <Brain className="h-5 w-5" />,
    Clock: <Clock className="h-5 w-5" />,
};

export default function FeatureCards() {
    return (
        <section className="bg-bg-base py-20 px-6">
            <div className="mx-auto max-w-[1200px]">
                <div className="text-center mb-12">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-3 mb-3">
                        Core Capabilities
                    </p>
                    <h2 className="text-[32px] font-bold tracking-tight text-text-1">
                        Three Engines. Zero Blind Spots.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {featureCards.map((card, i) => (
                        <GlassCard key={i} hover padding="p-6">
                            {/* Icon */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-dim border border-blue-border text-blue mb-4">
                                {iconMap[card.icon]}
                            </div>

                            {/* Title */}
                            <h3 className="text-[15px] font-semibold text-text-1 mb-2">
                                {card.title}
                            </h3>

                            {/* Description */}
                            <p className="text-[13px] text-text-2 leading-relaxed mb-4">
                                {card.description}
                            </p>

                            {/* Tags or Badge */}
                            {card.tags && (
                                <div className="flex flex-wrap gap-1.5">
                                    {card.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[10px] font-medium text-text-3"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {card.badge && (
                                <Badge variant="info" dot={false} className="mt-1">
                                    {card.badge}
                                </Badge>
                            )}
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
}
