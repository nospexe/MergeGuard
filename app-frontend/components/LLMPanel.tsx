"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentPhase } from "@/lib/llm-pipeline";

interface LLMPanelProps {
  tokens: string;
  isStreaming: boolean;
  agentPhase: AgentPhase;
}

const PHASE_LABELS: Record<AgentPhase, string> = {
  idle: "Idle",
  blast_interpreter: "Agent 1 — Blast Interpreter",
  pattern_explainer: "Agent 2 — Pattern Explainer",
  orchestrator: "Agent 3 — Orchestrator",
};

const PHASE_COLORS: Record<AgentPhase, string> = {
  idle: "#64748b",
  blast_interpreter: "#00d4ff",
  pattern_explainer: "#ffaa22",
  orchestrator: "#00ff88",
};

export default function LLMPanel({
  tokens,
  isStreaming,
  agentPhase,
}: LLMPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCursor, setShowCursor] = useState(true);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (scrollRef.current && isStreaming) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tokens, isStreaming]);

  // Blink cursor
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Simple markdown rendering
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4
            key={i}
            className="text-[13px] font-bold text-text-1 mt-3 mb-1.5"
          >
            {renderInline(line.slice(4))}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3
            key={i}
            className="text-[14px] font-bold text-text-1 mt-4 mb-2 flex items-center gap-2"
          >
            {renderInline(line.slice(3))}
          </h3>
        );
      }
      // Numbered list items
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={i} className="flex gap-2 ml-2 mb-1">
            <span className="text-text-3 text-[11px] font-mono flex-shrink-0">
              {line.match(/^\d+/)?.[0]}.
            </span>
            <span className="text-[11px] text-text-2 leading-relaxed">
              {renderInline(line.replace(/^\d+\.\s/, ""))}
            </span>
          </div>
        );
      }
      // Bullet points
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 ml-2 mb-1">
            <span className="text-text-3 text-[11px] mt-0.5">•</span>
            <span className="text-[11px] text-text-2 leading-relaxed">
              {renderInline(line.slice(2))}
            </span>
          </div>
        );
      }
      // Empty lines
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      // Regular text
      return (
        <p key={i} className="text-[11px] text-text-2 leading-relaxed mb-0.5">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text: string) => {
    // Handle **bold**, `code`, and regular text
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-text-1">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="rounded bg-glass px-1 py-0.5 text-[10px] font-mono text-cyan-400 border border-glass-border"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: isStreaming
                ? PHASE_COLORS[agentPhase]
                : "#64748b",
              boxShadow: isStreaming
                ? `0 0 8px ${PHASE_COLORS[agentPhase]}`
                : "none",
            }}
          />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-3">
            LLM Risk Brief
          </span>
        </div>
        {isStreaming && (
          <span
            className="text-[9px] font-mono animate-pulse"
            style={{ color: PHASE_COLORS[agentPhase] }}
          >
            {PHASE_LABELS[agentPhase]}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin"
      >
        {tokens ? (
          <div className="space-y-0">
            {renderMarkdown(tokens)}
            {isStreaming && showCursor && (
              <span
                className="inline-block h-[14px] w-[2px] ml-0.5 animate-pulse"
                style={{
                  background: PHASE_COLORS[agentPhase],
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-text-3"
                  style={{
                    animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] text-text-3 font-mono">
              Click &quot;Run Analysis&quot; to start the 3-agent pipeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
