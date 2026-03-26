"use client";

import { useState } from "react";
import GlassCard from "@/components/shared/GlassCard";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import { getPostMortem } from "@/lib/api";
import type { PostMortemResponse } from "@/lib/types";
import { Clock, AlertTriangle, FileCode } from "lucide-react";

export default function PostMortemPage() {
    const [repoPath, setRepoPath] = useState("");
    const [baseBranch, setBaseBranch] = useState("main");
    const [prBranch, setPrBranch] = useState("");
    const [result, setResult] = useState<PostMortemResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!repoPath || !prBranch) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPostMortem({
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

    const confidenceColor = (c: number) => {
        if (c >= 0.8) return "text-red";
        if (c >= 0.5) return "text-amber";
        return "text-green";
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-[32px] font-bold tracking-tight text-text-1">
                    PostMortem Analysis
                </h1>
                <p className="mt-1 text-sm text-text-2">
                    Mine historical failure patterns from your commit history
                </p>
            </div>

            {/* Input Form */}
            <GlassCard padding="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3 block mb-1.5">
                            Repository Path
                        </label>
                        <input
                            value={repoPath}
                            onChange={(e) => setRepoPath(e.target.value)}
                            placeholder="/path/to/your/repo"
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
                    <Clock className="h-3.5 w-3.5" />
                    {loading ? "Mining Patterns..." : "Run PostMortem"}
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
                    {/* Top Risk Files */}
                    {result.top_risk_files.length > 0 && (
                        <GlassCard padding="p-0">
                            <div className="border-b border-glass-border px-4 py-3">
                                <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                                    Top Risk Files
                                </h3>
                            </div>
                            <div className="flex flex-wrap gap-2 p-4">
                                {result.top_risk_files.map((file) => (
                                    <span
                                        key={file}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-border bg-red-dim px-3 py-1.5 font-mono text-[11px] text-red"
                                    >
                                        <FileCode className="h-3 w-3" />
                                        {file}
                                    </span>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    {/* Pattern Matches */}
                    <GlassCard padding="p-0">
                        <div className="border-b border-glass-border px-4 py-3">
                            <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-3">
                                Failure Patterns ({result.matches.length})
                            </h3>
                        </div>
                        <div className="space-y-[2px] p-2">
                            {result.matches.map((match) => (
                                <div
                                    key={match.pattern_id}
                                    className="rounded-lg border-[0.5px] border-glass-border bg-glass p-3 transition-all duration-150 hover:border-white/[0.15] hover:bg-glass-hover"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[11px] text-text-3">
                                                {match.pattern_id}
                                            </span>
                                            <Badge
                                                variant={match.confidence >= 0.8 ? "critical" : match.confidence >= 0.5 ? "warning" : "passed"}
                                            >
                                                {(match.confidence * 100).toFixed(0)}% confidence
                                            </Badge>
                                        </div>
                                        <span className="text-[11px] text-text-3">
                                            Support: {match.support}
                                        </span>
                                    </div>

                                    {/* Files involved */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {match.files.map((file) => (
                                            <span
                                                key={file}
                                                className="rounded-full border border-glass-border bg-glass px-2 py-0.5 font-mono text-[10px] text-text-3"
                                            >
                                                {file}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Confidence bar */}
                                    <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${confidenceColor(match.confidence).replace("text-", "bg-")}`}
                                            style={{ width: `${match.confidence * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {result.matches.length === 0 && (
                                <div className="flex items-center justify-center py-8 text-[13px] text-text-3">
                                    No failure patterns detected. Your repository looks clean!
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
