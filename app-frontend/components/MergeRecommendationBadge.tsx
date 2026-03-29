"use client";

import { useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/demo-data";

interface MergeRecommendationBadgeProps {
  level: RiskLevel | "PENDING";
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

const LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  GREEN: {
    label: "SAFE TO MERGE",
    color: "#00ff88",
    bg: "rgba(0, 255, 136, 0.08)",
    border: "rgba(0, 255, 136, 0.25)",
    glow: "0 0 20px rgba(0, 255, 136, 0.3)",
  },
  YELLOW: {
    label: "MERGE WITH CAUTION",
    color: "#ffaa22",
    bg: "rgba(255, 170, 34, 0.08)",
    border: "rgba(255, 170, 34, 0.25)",
    glow: "0 0 20px rgba(255, 170, 34, 0.3)",
  },
  RED: {
    label: "BLOCK MERGE",
    color: "#ff4444",
    bg: "rgba(255, 68, 68, 0.08)",
    border: "rgba(255, 68, 68, 0.25)",
    glow: "0 0 20px rgba(255, 68, 68, 0.3)",
  },
  PENDING: {
    label: "ANALYZING...",
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.08)",
    border: "rgba(100, 116, 139, 0.25)",
    glow: "none",
  },
};

const SIZE_CLASSES = {
  sm: "px-3 py-1 text-[10px]",
  md: "px-4 py-1.5 text-[11px]",
  lg: "px-6 py-2 text-[13px]",
};

export default function MergeRecommendationBadge({
  level,
  animated = true,
  size = "md",
}: MergeRecommendationBadgeProps) {
  const config = LEVEL_CONFIG[level];
  const [pulse, setPulse] = useState(false);

  // Pulse animation on level change
  useEffect(() => {
    if (level !== "PENDING") {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full border font-mono font-bold uppercase tracking-[0.15em]
        transition-all duration-500
        ${SIZE_CLASSES[size]}
        ${animated && level === "PENDING" ? "animate-pulse" : ""}
        ${pulse ? "scale-110" : "scale-100"}
      `}
      style={{
        color: config.color,
        background: config.bg,
        borderColor: config.border,
        boxShadow: config.glow,
      }}
      role="status"
      aria-label={`Merge recommendation: ${config.label}`}
    >
      {/* Status dot */}
      <span
        className="relative flex h-2 w-2"
        style={{ color: config.color }}
      >
        {level !== "PENDING" && animated && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: config.color }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: config.color }}
        />
      </span>

      {config.label}
    </div>
  );
}
