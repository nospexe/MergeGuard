"use client";

import { useState, useCallback } from "react";
import BlastRadiusGraph from "@/components/BlastRadiusGraph";
import PostMortemTimeline from "@/components/PostMortemTimeline";
import LLMPanel from "@/components/LLMPanel";
import MergeRecommendationBadge from "@/components/MergeRecommendationBadge";
import { scenarioA, scenarioB, type DemoAnalysis } from "@/lib/demo-data";
import { runLLMPipeline, type AgentPhase, type RiskLevel } from "@/lib/llm-pipeline";
import { GitBranch, Play, RotateCcw, FileCode } from "lucide-react";

export default function DashboardPage() {
  const [activeScenario, setActiveScenario] = useState<DemoAnalysis>(scenarioA);
  const [llmTokens, setLlmTokens] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("idle");
  const [riskLevel, setRiskLevel] = useState<RiskLevel | "PENDING">(
    activeScenario.riskLevel
  );
  const [analysisRun, setAnalysisRun] = useState(false);

  const handleRunAnalysis = useCallback(async () => {
    setLlmTokens("");
    setIsStreaming(true);
    setRiskLevel("PENDING");
    setAnalysisRun(true);

    await runLLMPipeline(
      activeScenario.blastRadius,
      activeScenario.postMortem,
      {
        onToken: (token) => {
          setLlmTokens((prev) => prev + token);
        },
        onPhaseChange: (phase) => {
          setAgentPhase(phase);
        },
        onRiskLevel: (level) => {
          setRiskLevel(level);
        },
        onComplete: () => {
          setIsStreaming(false);
          setAgentPhase("idle");
        },
        onError: (error) => {
          setIsStreaming(false);
          setAgentPhase("idle");
          setLlmTokens((prev) => prev + `\n\n**Error:** ${error}`);
        },
      }
    );
  }, [activeScenario]);

  const handleReset = useCallback(() => {
    setLlmTokens("");
    setIsStreaming(false);
    setAgentPhase("idle");
    setRiskLevel(activeScenario.riskLevel);
    setAnalysisRun(false);
  }, [activeScenario]);

  const handleScenarioChange = useCallback(
    (scenario: DemoAnalysis) => {
      if (isStreaming) return;
      setActiveScenario(scenario);
      setLlmTokens("");
      setRiskLevel(scenario.riskLevel);
      setAnalysisRun(false);
      setAgentPhase("idle");
    },
    [isStreaming]
  );

  const timelineData =
    activeScenario.postMortem.incidents_timeline || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text-1 font-mono">
            Analysis Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-2 flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5" />
            <span className="font-mono text-text-3">
              {activeScenario.repoName}
            </span>
            <span className="text-text-3">/</span>
            <span className="font-mono text-[#00d4ff]">
              {activeScenario.branch}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scenario Selector */}
          <div className="flex rounded-lg border border-glass-border overflow-hidden">
            <button
              onClick={() => handleScenarioChange(scenarioA)}
              disabled={isStreaming}
              className={`px-3 py-1.5 text-[11px] font-mono font-semibold transition-all ${
                activeScenario.id === scenarioA.id
                  ? "bg-[rgba(255,68,68,0.1)] text-[#ff4444] border-r border-glass-border"
                  : "text-text-3 hover:text-text-2 border-r border-glass-border"
              }`}
            >
              🔴 HIGH RISK
            </button>
            <button
              onClick={() => handleScenarioChange(scenarioB)}
              disabled={isStreaming}
              className={`px-3 py-1.5 text-[11px] font-mono font-semibold transition-all ${
                activeScenario.id === scenarioB.id
                  ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]"
                  : "text-text-3 hover:text-text-2"
              }`}
            >
              🟢 LOW RISK
            </button>
          </div>

          <MergeRecommendationBadge
            level={analysisRun ? riskLevel : activeScenario.riskLevel}
          />

          <button
            onClick={handleRunAnalysis}
            disabled={isStreaming}
            className="flex items-center gap-2 rounded-lg bg-[#00d4ff] px-4 py-2 text-[12px] font-bold text-[#0a0b0d] transition-all hover:bg-[#00bfe8] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-3.5 w-3.5" />
            {isStreaming ? "Running..." : "Run Analysis"}
          </button>

          {analysisRun && !isStreaming && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-[11px] text-text-3 hover:text-text-2 transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Affected Files",
            value: activeScenario.blastRadius.nodes.length,
            color: activeScenario.blastRadius.nodes.length > 10 ? "#ff4444" : "#00ff88",
          },
          {
            label: "Risk Score",
            value: `${activeScenario.blastRadius.risk_score}/100`,
            color:
              activeScenario.blastRadius.risk_score > 70
                ? "#ff4444"
                : activeScenario.blastRadius.risk_score > 40
                ? "#ffaa22"
                : "#00ff88",
          },
          {
            label: "Coverage",
            value: `${activeScenario.blastRadius.overall_coverage}%`,
            color:
              activeScenario.blastRadius.overall_coverage < 50
                ? "#ff4444"
                : activeScenario.blastRadius.overall_coverage < 70
                ? "#ffaa22"
                : "#00ff88",
          },
          {
            label: "Pattern Matches",
            value: activeScenario.postMortem.matches.length,
            color: activeScenario.postMortem.matches.length > 0 ? "#ffaa22" : "#00ff88",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-glass-border bg-glass p-4"
          >
            <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-3">
              {stat.label}
            </p>
            <p
              className="mt-1 text-[24px] font-mono font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Three-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: "500px" }}>
        {/* Left Panel: BlastRadius */}
        <div className="rounded-xl border border-glass-border bg-glass overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#00d4ff]" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-3">
                BlastRadius Graph
              </span>
            </div>
            <span className="text-[9px] font-mono text-text-3">
              {activeScenario.blastRadius.nodes.length} nodes
            </span>
          </div>
          <div className="flex-1 min-h-[400px]">
            <BlastRadiusGraph data={activeScenario.blastRadius} />
          </div>
        </div>

        {/* Center Panel: PostMortem Timeline */}
        <div className="rounded-xl border border-glass-border bg-glass overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#ffaa22]" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-3">
                PostMortem Timeline
              </span>
            </div>
            <span className="text-[9px] font-mono text-text-3">
              {timelineData.length} incidents
            </span>
          </div>
          <div className="flex-1 min-h-[400px] p-2">
            <PostMortemTimeline data={timelineData} />
          </div>

          {/* Pattern Matches List */}
          {activeScenario.postMortem.matches.length > 0 && (
            <div className="border-t border-glass-border px-4 py-3">
              <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-3 mb-2">
                Fingerprint Matches
              </p>
              <div className="space-y-2">
                {activeScenario.postMortem.matches.map((match) => (
                  <div
                    key={match.pattern_id}
                    className="flex items-center justify-between rounded-lg bg-[rgba(255,255,255,0.02)] border border-glass-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3 w-3 text-text-3" />
                      <span className="text-[11px] font-mono text-[#00d4ff]">
                        {match.pattern_id}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{
                        color:
                          match.confidence > 0.7
                            ? "#ff4444"
                            : match.confidence > 0.5
                            ? "#ffaa22"
                            : "#00ff88",
                      }}
                    >
                      {(match.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: LLM Risk Brief */}
        <div className="rounded-xl border border-glass-border bg-glass overflow-hidden flex flex-col min-h-[400px]">
          <LLMPanel
            tokens={llmTokens}
            isStreaming={isStreaming}
            agentPhase={agentPhase}
          />
        </div>
      </div>

      {/* Diff Preview */}
      <div className="rounded-xl border border-glass-border bg-glass overflow-hidden">
        <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[rgba(248,250,252,0.3)]" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-3">
              Diff Preview
            </span>
          </div>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto">
          {activeScenario.diff.split("\n").map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("+")
                  ? "text-[#00ff88] bg-[rgba(0,255,136,0.05)]"
                  : line.startsWith("-")
                  ? "text-[#ff4444] bg-[rgba(255,68,68,0.05)]"
                  : line.startsWith("@@")
                  ? "text-[#00d4ff]"
                  : "text-text-3"
              }
            >
              {line}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
