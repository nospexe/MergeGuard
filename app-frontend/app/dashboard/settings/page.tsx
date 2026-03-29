"use client";

import { useState, useEffect, useCallback } from "react";
import GlassCard from "@/components/shared/GlassCard";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import { Settings as SettingsIcon, Server, GitBranch, Shield, Save, CheckCircle } from "lucide-react";
import { healthCheck } from "@/lib/api";

const STORAGE_KEY = "mergeguard-settings";

interface SettingsState {
    apiBaseUrl: string;
    ollamaHost: string;
    defaultRepo: string;
    defaultBaseBranch: string;
    minSupport: string;
    minConfidence: string;
    maxDepth: string;
}

const defaultSettings: SettingsState = {
    apiBaseUrl: "http://localhost:8000",
    ollamaHost: "http://localhost:11434",
    defaultRepo: "",
    defaultBaseBranch: "main",
    minSupport: "0.02",
    minConfidence: "0.50",
    maxDepth: "5",
};

function loadSettings(): SettingsState {
    if (typeof window === "undefined") return defaultSettings;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch { /* ignore parse errors */ }
    return defaultSettings;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState>(defaultSettings);
    const [mounted, setMounted] = useState(false);
    const [saved, setSaved] = useState(false);
    const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
    const [backendVersion, setBackendVersion] = useState<string>("");

    // Hydrate from localStorage after mount (SSR-safe)
    useEffect(() => {
        setSettings(loadSettings());
        setMounted(true);
    }, []);

    // Check backend health on mount
    useEffect(() => {
    let cancelled = false;
    healthCheck()
        .then((res) => {
        if (!cancelled) {
            setBackendStatus("connected");
            setBackendVersion(res.version || "");
        }
        })
        .catch(() => { if (!cancelled) setBackendStatus("disconnected"); });
    return () => { cancelled = true; };
    }, []);

    const update = useCallback((field: keyof SettingsState, value: string) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    }, []);

    const handleSave = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch { /* storage full — unlikely */ }
    }, [settings]);

    // Prevent hydration mismatch flicker
    if (!mounted) return null;

    const inputClass =
        "w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] font-mono text-text-2 outline-none focus:shadow-focus transition-shadow";
    const labelClass =
        "text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5";

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight text-text-1">
                        Settings
                    </h1>
                    <p className="mt-1 text-sm text-text-2">
                        Configure MergeGuard analysis parameters and integrations
                    </p>
                </div>
                <Button
                    variant={saved ? "secondary" : "primary"}
                    size="md"
                    onClick={handleSave}
                    className="gap-2"
                >
                    {saved ? (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Settings
                        </>
                    )}
                </Button>
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
                            <label className={labelClass}>
                                API Base URL
                            </label>
                            <input
                                value={settings.apiBaseUrl}
                                onChange={(e) => update("apiBaseUrl", e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Ollama Host
                            </label>
                            <input
                                value={settings.ollamaHost}
                                onChange={(e) => update("ollamaHost", e.target.value)}
                                className={inputClass}
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
                            <label className={labelClass}>
                                Default Repository
                            </label>
                            <input
                                value={settings.defaultRepo}
                                onChange={(e) => update("defaultRepo", e.target.value)}
                                placeholder="/path/to/your/repo"
                                className={`${inputClass} placeholder:text-text-3`}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                Default Base Branch
                            </label>
                            <input
                                value={settings.defaultBaseBranch}
                                onChange={(e) => update("defaultBaseBranch", e.target.value)}
                                className={inputClass}
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
                            <label className="text-[12px] text-text-2">Min Support</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={settings.minSupport}
                                onChange={(e) => update("minSupport", e.target.value)}
                                className="w-20 rounded-lg border border-glass-border bg-glass px-2 py-1 text-right font-mono text-[12px] text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] text-text-2">Min Confidence</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={settings.minConfidence}
                                onChange={(e) => update("minConfidence", e.target.value)}
                                className="w-20 rounded-lg border border-glass-border bg-glass px-2 py-1 text-right font-mono text-[12px] text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] text-text-2">Max Depth</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                max="20"
                                value={settings.maxDepth}
                                onChange={(e) => update("maxDepth", e.target.value)}
                                className="w-20 rounded-lg border border-glass-border bg-glass px-2 py-1 text-right font-mono text-[12px] text-text-2 outline-none focus:shadow-focus transition-shadow"
                            />
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
                            {backendStatus === "checking" && (
                                <Badge variant="scanning">Checking…</Badge>
                            )}
                            {backendStatus === "connected" && (
                                <Badge variant="passed">
                                    Connected{backendVersion ? ` v${backendVersion}` : ""}
                                </Badge>
                            )}
                            {backendStatus === "disconnected" && (
                                <Badge variant="critical">Disconnected</Badge>
                            )}
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
