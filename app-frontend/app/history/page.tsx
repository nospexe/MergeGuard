"use client";

import { useState } from "react";
import { demoAnalyses, type DemoAnalysis } from "@/lib/demo-data";
import {
  Clock,
  GitBranch,
  ChevronDown,
  ChevronUp,
  FileCode,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import MergeRecommendationBadge from "@/components/MergeRecommendationBadge";

export default function HistoryPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const analyses = demoAnalyses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text-1 font-mono">
            Analysis History
          </h1>
          <p className="mt-1 text-sm text-text-2">
            Past analyses and their results
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-text-3" />
          <span className="text-[11px] font-mono text-text-3">
            {analyses.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-glass-border bg-glass overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_40px] gap-4 border-b border-glass-border px-6 py-3 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-3">
          <span>Repository</span>
          <span>Branch</span>
          <span>Risk</span>
          <span>Patterns</span>
          <span>Timestamp</span>
          <span />
        </div>

        {/* Table Rows */}
        {analyses.map((analysis) => (
          <HistoryRow
            key={analysis.id}
            analysis={analysis}
            expanded={expandedId === analysis.id}
            onToggle={() =>
              setExpandedId(
                expandedId === analysis.id ? null : analysis.id
              )
            }
          />
        ))}

        {analyses.length === 0 && (
          <div className="py-16 text-center text-text-3 text-sm">
            No analyses found. Run your first analysis from the{" "}
            <a href="/analyze" className="text-[#00d4ff] hover:underline">
              Analyze
            </a>{" "}
            page.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: DemoAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const timestamp = new Date(analysis.createdAt);
  const matchCount = analysis.postMortem.matches.length;
  const Icon =
    analysis.riskLevel === "RED" ? AlertTriangle : CheckCircle;
  const iconColor =
    analysis.riskLevel === "RED"
      ? "#ff4444"
      : analysis.riskLevel === "YELLOW"
      ? "#ffaa22"
      : "#00ff88";

  return (
    <div className="border-b border-glass-border last:border-0">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[1fr_1fr_auto_auto_auto_40px] gap-4 px-6 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
        aria-expanded={expanded}
        aria-label={`Toggle details for ${analysis.repoName}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: iconColor }} />
          <span className="text-[13px] font-mono text-text-1 truncate">
            {analysis.repoName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-text-3" />
          <span className="text-[12px] font-mono text-[#00d4ff] truncate">
            {analysis.branch}
          </span>
        </div>
        <MergeRecommendationBadge level={analysis.riskLevel} size="sm" animated={false} />
        <div className="flex items-center gap-1.5">
          <FileCode className="h-3 w-3 text-text-3" />
          <span className="text-[11px] font-mono text-text-2">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        </div>
        <span className="text-[11px] font-mono text-text-3">
          {timestamp.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center justify-center">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-3" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-3" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-glass-border bg-[rgba(255,255,255,0.01)] px-6 py-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Affected Files",
                value: analysis.blastRadius.nodes.length,
                color:
                  analysis.blastRadius.nodes.length > 10
                    ? "#ff4444"
                    : "#00ff88",
              },
              {
                label: "Risk Score",
                value: `${analysis.blastRadius.risk_score}/100`,
                color:
                  analysis.blastRadius.risk_score > 70
                    ? "#ff4444"
                    : "#00ff88",
              },
              {
                label: "Coverage",
                value: `${analysis.blastRadius.overall_coverage}%`,
                color:
                  analysis.blastRadius.overall_coverage < 50
                    ? "#ff4444"
                    : "#00ff88",
              },
              {
                label: "Fingerprint Matches",
                value: matchCount,
                color: matchCount > 0 ? "#ffaa22" : "#00ff88",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-glass-border bg-glass p-3"
              >
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-text-3">
                  {stat.label}
                </p>
                <p
                  className="mt-0.5 text-[18px] font-mono font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Fingerprint Matches */}
          {analysis.postMortem.matches.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2">
                Fingerprint Matches
              </h4>
              <div className="space-y-2">
                {analysis.postMortem.matches.map((match) => (
                  <div
                    key={match.pattern_id}
                    className="rounded-lg border border-glass-border bg-glass p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-mono font-bold text-[#00d4ff]">
                        {match.pattern_id}
                      </span>
                      <span
                        className="text-[11px] font-mono font-bold"
                        style={{
                          color:
                            match.confidence > 0.7
                              ? "#ff4444"
                              : match.confidence > 0.5
                              ? "#ffaa22"
                              : "#00ff88",
                        }}
                      >
                        {(match.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-[10px] text-text-3 mb-1.5">
                      Files: {match.files.join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.evidence_commits.map((hash) => (
                        <code
                          key={hash}
                          className="rounded bg-[rgba(0,212,255,0.05)] px-1.5 py-0.5 text-[9px] font-mono text-[#00d4ff] border border-[rgba(0,212,255,0.15)]"
                        >
                          {hash}
                        </code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff */}
          <div>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2">
              Diff
            </h4>
            <pre className="rounded-lg border border-glass-border bg-[rgba(0,0,0,0.3)] p-3 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[200px] overflow-y-auto">
              {analysis.diff.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "text-[#00ff88]"
                      : line.startsWith("-")
                      ? "text-[#ff4444]"
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

          {/* Top Risk Files */}
          {analysis.postMortem.top_risk_files.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-3 mb-2">
                Top Risk Files
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.postMortem.top_risk_files.map((file) => (
                  <span
                    key={file}
                    className="rounded-full border border-[rgba(255,68,68,0.2)] bg-[rgba(255,68,68,0.05)] px-2.5 py-0.5 text-[10px] font-mono text-[#ff8888]"
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
