"use client";

import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import { getBlastRadius } from "@/lib/api";
import type { BlastRadiusResponse } from "@/lib/types";
import { Play, AlertTriangle, CheckCircle } from "lucide-react";

export default function BlastRadiusPage() {
    const [repoPath, setRepoPath] = useState("");
    const [baseBranch, setBaseBranch] = useState("main");
    const [prBranch, setPrBranch] = useState("");
    const [result, setResult] = useState<BlastRadiusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!repoPath || !prBranch) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getBlastRadius({
                repo_path: repoPath,
                base_branch: baseBranch,
                pr_branch: prBranch,
            });
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    const riskColor = (level: string) => {
        switch (level) {
            case "high": return "text-red";
            case "medium": return "text-amber";
            default: return "text-green";
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-[32px] font-bold tracking-tight text-text-1">
                    Blast Radius Analysis
                </h1>
                <p className="mt-1 text-sm text-text-2">
                    Trace the symbol-level impact of code changes across your codebase
                </p>
            </div>

            {/* Input Form */}
            <GlassCard padding="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                            Repository (GitHub URL or local path)
                        </label>
                        <input
                            value={repoPath}
                            onChange={(e) => setRepoPath(e.target.value)}
                            placeholder="https://github.com/owner/repo or /path/to/repo"
                            className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] text-text-1 placeholder:text-text-3 outline-none focus:shadow-focus transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                            Base Branch
                        </label>
                        <input
                            value={baseBranch}
                            onChange={(e) => setBaseBranch(e.target.value)}
                            placeholder="main"
                            className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] text-text-1 placeholder:text-text-3 outline-none focus:shadow-focus transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                            PR Branch
                        </label>
                        <input
                            value={prBranch}
                            onChange={(e) => setPrBranch(e.target.value)}
                            placeholder="feature/my-branch"
                            className="w-full rounded-lg border border-glass-border bg-glass px-3 py-2 text-[13px] text-text-1 placeholder:text-text-3 outline-none focus:shadow-focus transition-shadow"
                        />
                    </div>
                </div>
                <Button onClick={handleAnalyze} disabled={loading || !repoPath || !prBranch}>
                    <Play className="h-3.5 w-3.5" />
                    {loading ? "Analyzing..." : "Run Analysis"}
                </Button>
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-panel border border-red-border bg-red-dim p-3 text-[13px] text-red">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <GlassCard>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">Risk Score</p>
                            <p className={`text-[36px] font-bold ${riskColor(result.risk_level)}`}>
                                {(result.risk_score * 100).toFixed(1)}%
                            </p>
                        </GlassCard>
                        <GlassCard>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">Affected Nodes</p>
                            <p className="text-[36px] font-bold text-text-1">{result.nodes.length}</p>
                        </GlassCard>
                        <GlassCard>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">Coverage</p>
                            <p className="text-[36px] font-bold text-green">
                                {(result.overall_coverage * 100).toFixed(1)}%
                            </p>
                        </GlassCard>
                    </div>

                    {/* Nodes */}
                    <GlassCard padding="p-0">
                        <div className="border-b border-glass-border px-4 py-3">
                            <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                                Affected Symbols ({result.nodes.length})
                            </h3>
                        </div>
                        <div className="space-y-[2px] p-2">
                            {result.nodes.map((node) => (
                                <div
                                    key={node.id}
                                    className="flex items-center gap-3 rounded-lg border-[0.5px] border-glass-border bg-glass px-3 py-2.5 transition-all duration-150 hover:border-white/[0.15] hover:bg-glass-hover"
                                >
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-glass border border-glass-border text-[10px] font-mono text-text-3">
                                        R{node.ring}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-[12px] text-text-2 truncate">{node.file}</p>
                                        <p className="font-mono text-[10px] text-text-3">{node.symbol}</p>
                                    </div>
                                    <Badge
                                        variant={node.coverage_status === "uncovered" ? "critical" : "passed"}
                                        className="text-[9px]"
                                    >
                                        {node.coverage_status === "uncovered" ? "UNCOVERED" : "COVERED"}
                                    </Badge>
                                    {node.coverage_status === "covered" ? (
                                        <CheckCircle className="h-3.5 w-3.5 text-green flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle className="h-3.5 w-3.5 text-red flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
