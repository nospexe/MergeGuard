"use client";

import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import { Shield, AlertTriangle, Clock } from "lucide-react";

const incidents = [
    {
        icon: <AlertTriangle className="h-5 w-5 text-red" />,
        title: "Logic Bomb Prevented",
        description: "Detected suspicious self-destructing code pattern in auth service before it reached staging.",
        time: "2 hours ago",
        severity: "critical" as const,
    },
    {
        icon: <Shield className="h-5 w-5 text-amber" />,
        title: "Dependency Chain Risk",
        description: "Flagged a transitive dependency bump that would have broken 3 downstream microservices.",
        time: "5 hours ago",
        severity: "warning" as const,
    },
    {
        icon: <Clock className="h-5 w-5 text-green" />,
        title: "Regression Blocked",
        description: "Historical pattern match identified a code change that resembled a previous P0 incident.",
        time: "1 day ago",
        severity: "passed" as const,
    },
];

export default function IncidentSection() {
    return (
        <section className="bg-bg-base py-20 px-6">
            <div className="mx-auto max-w-[1200px]">
                <div className="text-center mb-12">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-3 mb-3">
                        Real-Time Protection
                    </p>
                    <h2 className="text-[32px] font-bold tracking-tight text-text-1">
                        Incidents We&apos;ve Stopped
                    </h2>
                    <p className="mt-3 text-sm text-text-2 max-w-md mx-auto">
                        Every prevented incident represents hours of debugging time saved and potential outages avoided.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {incidents.map((incident, i) => (
                        <GlassCard key={i} hover>
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-glass border border-glass-border flex-shrink-0">
                                    {incident.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-[14px] font-semibold text-text-1 truncate">
                                            {incident.title}
                                        </h3>
                                    </div>
                                    <p className="text-[12px] text-text-2 leading-relaxed mb-3">
                                        {incident.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-text-3">{incident.time}</span>
                                        <Badge variant={incident.severity}>{incident.severity}</Badge>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
}
