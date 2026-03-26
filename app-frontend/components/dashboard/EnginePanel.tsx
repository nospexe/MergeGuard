"use client";

import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import SystemPulse from "@/components/dashboard/SystemPulse";
import type { EngineStatus, GitMinerStatus } from "@/lib/types";

interface EnginePanelProps {
    engine: EngineStatus;
    miner: GitMinerStatus;
    pulse: number[];
}

export default function EnginePanel({ engine, miner, pulse }: EnginePanelProps) {
    return (
        <GlassCard className="w-[300px] flex-shrink-0" padding="p-0">
            {/* Engine Status */}
            <div className="border-b border-glass-border p-4">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-medium text-text-2">
                        {engine.name}
                    </span>
                    <Badge variant="passed" dot={true}>
                        {engine.status.toUpperCase()}
                    </Badge>
                </div>
                <p className="mt-2 font-mono text-[11px] text-text-3">
                    {engine.submodel} · {engine.temp}°C · {engine.tokensPerSec} tok/s
                </p>
            </div>

            {/* Git Miner */}
            <div className="border-b border-glass-border p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                        Git Miner
                    </span>
                    <span className="font-mono text-[11px] text-text-2">{miner.progress}%</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/5 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue to-purple transition-all duration-700"
                        style={{ width: `${miner.progress}%` }}
                    />
                </div>
                <p className="mt-2 font-mono text-[11px] text-text-3">{miner.statusLine}</p>
            </div>

            {/* System Pulse */}
            <div className="p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                    System Pulse
                </p>
                <SystemPulse values={pulse} />
            </div>
        </GlassCard>
    );
}
