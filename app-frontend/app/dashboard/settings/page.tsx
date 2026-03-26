"use client";

import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import { Settings as SettingsIcon, Server, GitBranch, Shield } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-[32px] font-bold tracking-tight text-text-1">
                    Settings
                </h1>
                <p className="mt-1 text-sm text-text-2">
                    Configure MergeGuard analysis parameters and integrations
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Config */}
                <GlassCard padding="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-dim border border-blue-border">
                            <Server className="h-4 w-4 text-blue" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-text-1">API Configuration</h3>
                            <p className="text-[11px] text-text-3">Backend connection settings</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                                API Base URL
                            </label>
                            <input
                                defaultValue="http://localhost:8000"
                                className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] font-mono text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                                Ollama Host
                            </label>
                            <input
                                defaultValue="http://localhost:11434"
                                className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] font-mono text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Git Config */}
                <GlassCard padding="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-dim border border-green-border">
                            <GitBranch className="h-4 w-4 text-green" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-text-1">Repository Settings</h3>
                            <p className="text-[11px] text-text-3">Default repository configuration</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                                Default Repository
                            </label>
                            <input
                                placeholder="/path/to/your/repo"
                                className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] font-mono text-text-2 placeholder:text-text-3 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                                Default Base Branch
                            </label>
                            <input
                                defaultValue="main"
                                className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] font-mono text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Analysis Config */}
                <GlassCard padding="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-dim border border-amber-border">
                            <SettingsIcon className="h-4 w-4 text-amber" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-text-1">Analysis Parameters</h3>
                            <p className="text-[11px] text-text-3">Fine-tune risk analysis thresholds</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Min Support</span>
                            <span className="font-mono text-[12px] text-text-3">0.02</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Min Confidence</span>
                            <span className="font-mono text-[12px] text-text-3">0.50</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Max Depth</span>
                            <span className="font-mono text-[12px] text-text-3">5</span>
                        </div>
                    </div>
                </GlassCard>

                {/* Status */}
                <GlassCard padding="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-dim border border-blue-border">
                            <Shield className="h-4 w-4 text-blue" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-text-1">System Status</h3>
                            <p className="text-[11px] text-text-3">Current service health</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Backend API</span>
                            <Badge variant="passed">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Ollama Engine</span>
                            <Badge variant="passed">Ready</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-2">Git Miner</span>
                            <Badge variant="scanning">Scanning</Badge>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
