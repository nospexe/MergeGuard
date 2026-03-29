"use client";

import { useState, useCallback } from "react";
import { GitBranch, FolderGit, FileText, Play, Loader2 } from "lucide-react";
import MergeRecommendationBadge from "@/components/MergeRecommendationBadge";
import LLMPanel from "@/components/LLMPanel";
import { scenarioA, scenarioB, type DemoAnalysis } from "@/lib/demo-data";
import { runLLMPipeline, type AgentPhase, type RiskLevel } from "@/lib/llm-pipeline";

const PRESETS: Array<{ label: string; scenario: DemoAnalysis }> = [
  {
    label: "Django Cache Refactor (HIGH RISK)",
    scenario: scenarioA,
  },
  {
    label: "Docstring Update (LOW RISK)",
    scenario: scenarioB,
  },
];

export default function AnalyzePage() {
  const [repoPath, setRepoPath] = useState(scenarioA.repoName);
  const [branch, setBranch] = useState(scenarioA.branch);
  const [diff, setDiff] = useState(scenarioA.diff);
  const [selectedPreset, setSelectedPreset] = useState(0);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [llmTokens, setLlmTokens] = useState("");
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("idle");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "PENDING">("PENDING");
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handlePresetChange = useCallback(
    (idx: number) => {
      if (isAnalyzing) return;
      setSelectedPreset(idx);
      const preset = PRESETS[idx];
      setRepoPath(preset.scenario.repoName);
      setBranch(preset.scenario.branch);
      setDiff(preset.scenario.diff);
      setLlmTokens("");
      setRiskLevel("PENDING");
      setAnalysisComplete(false);
    },
    [isAnalyzing]
  );

  const handleSubmit = useCallback(async () => {
    setIsAnalyzing(true);
    setLlmTokens("");
    setRiskLevel("PENDING");
    setAnalysisComplete(false);

    const scenario = PRESETS[selectedPreset].scenario;

    await runLLMPipeline(scenario.blastRadius, scenario.postMortem, {
      onToken: (token) => setLlmTokens((prev) => prev + token),
      onPhaseChange: (phase) => setAgentPhase(phase),
      onRiskLevel: (level) => setRiskLevel(level),
      onComplete: () => {
        setIsAnalyzing(false);
        setAgentPhase("idle");
        setAnalysisComplete(true);
      },
      onError: (error) => {
        setIsAnalyzing(false);
        setAgentPhase("idle");
        setLlmTokens((prev) => prev + `\n\n**Error:** ${error}`);
      },
    });
  }, [selectedPreset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-text-1 font-mono">
          New Analysis
        </h1>
        <p className="mt-1 text-sm text-text-2">
          Configure and run a pre-merge risk analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Preset Selector */}
          <div className="rounded-xl border border-glass-border bg-glass p-5">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-3">
              Demo Presets
            </label>
            <div className="space-y-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetChange(idx)}
                  disabled={isAnalyzing}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-[12px] font-medium transition-all ${
                    selectedPreset === idx
                      ? "border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.05)] text-[#00d4ff]"
                      : "border-glass-border bg-[rgba(255,255,255,0.02)] text-text-2 hover:border-[rgba(255,255,255,0.12)]"
                  } disabled:opacity-50`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repo Path */}
          <div className="rounded-xl border border-glass-border bg-glass p-5">
            <label
              htmlFor="repo-path"
              className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2"
            >
              <FolderGit className="h-3 w-3" />
              Repository Path
            </label>
            <input
              id="repo-path"
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              disabled={isAnalyzing}
              className="w-full rounded-lg border border-glass-border bg-[rgba(255,255,255,0.02)] px-4 py-2.5 font-mono text-[13px] text-text-1 outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors disabled:opacity-50"
              placeholder="/path/to/repo or org/repo"
            />
          </div>

          {/* Branch */}
          <div className="rounded-xl border border-glass-border bg-glass p-5">
            <label
              htmlFor="branch-name"
              className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2"
            >
              <GitBranch className="h-3 w-3" />
              Branch Name
            </label>
            <input
              id="branch-name"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isAnalyzing}
              className="w-full rounded-lg border border-glass-border bg-[rgba(255,255,255,0.02)] px-4 py-2.5 font-mono text-[13px] text-text-1 outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors disabled:opacity-50"
              placeholder="feature/my-branch"
            />
          </div>

          {/* Diff Input */}
          <div className="rounded-xl border border-glass-border bg-glass p-5">
            <label
              htmlFor="diff-input"
              className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2"
            >
              <FileText className="h-3 w-3" />
              Diff Input
            </label>
            <textarea
              id="diff-input"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              disabled={isAnalyzing}
              rows={10}
              className="w-full rounded-lg border border-glass-border bg-[rgba(255,255,255,0.02)] px-4 py-3 font-mono text-[11px] text-text-2 leading-relaxed outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors resize-y disabled:opacity-50"
              placeholder="Paste your diff here..."
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || !repoPath || !branch}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00d4ff] py-3 text-[14px] font-bold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Submit Analysis
              </>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Risk Badge */}
          <div className="rounded-xl border border-glass-border bg-glass p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-1">
                Analysis Result
              </p>
              <p className="text-[12px] text-text-2">
                {analysisComplete
                  ? "Analysis complete"
                  : isAnalyzing
                  ? "Running 3-agent pipeline..."
                  : "Select a preset and submit"}
              </p>
            </div>
            <MergeRecommendationBadge level={riskLevel} />
          </div>

          {/* LLM Output */}
          <div className="rounded-xl border border-glass-border bg-glass overflow-hidden" style={{ minHeight: "500px" }}>
            <LLMPanel
              tokens={llmTokens}
              isStreaming={isAnalyzing}
              agentPhase={agentPhase}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
