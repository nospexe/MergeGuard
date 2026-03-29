"use client";

import { useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoricalChartState } from "recharts/types/chart/types";

interface TimelineEvent {
  date: string;
  count: number;
  commits: string[];
  severity: string;
}

interface PostMortemTimelineProps {
  data: TimelineEvent[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff3344",
  HIGH: "#ff8800",
  MEDIUM: "#ffcc00",
  LOW: "#00d4ff",
};

interface CommitModalData {
  date: string;
  commits: string[];
  severity: string;
  count: number;
}

export default function PostMortemTimeline({ data }: PostMortemTimelineProps) {
  const [modalData, setModalData] = useState<CommitModalData | null>(null);

  const handleClick = useCallback(
    (payload: CategoricalChartState) => {
      if (!payload) return;
      const activePayload = payload.activePayload as Array<{
        payload: TimelineEvent;
      }> | undefined;
      if (activePayload && activePayload.length > 0 && activePayload[0]?.payload) {
        const event = activePayload[0].payload;
        setModalData({
          date: event.date,
          commits: event.commits,
          severity: event.severity,
          count: event.count,
        });
      }
    },
    []
  );

  const chartData = data.map((event) => ({
    ...event,
    fill: SEVERITY_COLORS[event.severity] || "#666",
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-3 text-sm font-mono">
        No incident history found
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          <defs>
            <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-dm-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickFormatter={(value: string) => {
              const d = new Date(value);
              return d.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
            }}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-dm-mono)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(13, 17, 23, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono)",
              color: "#f8fafc",
            }}
            labelFormatter={(value: string) => {
              const d = new Date(value);
              return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }}
            formatter={(value: number, _name: string, props: { payload?: TimelineEvent }) => {
              const severity = props.payload?.severity || "UNKNOWN";
              return [
                `${value} incident${value !== 1 ? "s" : ""} (${severity})`,
                "Incidents",
              ];
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#ff4444"
            strokeWidth={2}
            fill="url(#incidentGradient)"
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: TimelineEvent;
              };
              const color =
                SEVERITY_COLORS[(payload as TimelineEvent).severity] || "#666";
              return (
                <circle
                  key={`dot-${payload.date}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  stroke="#0d1117"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                />
              );
            }}
            activeDot={{
              r: 8,
              stroke: "#ff4444",
              strokeWidth: 2,
              fill: "#0d1117",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Severity Legend */}
      <div className="absolute top-2 right-2 flex gap-3 text-[9px] font-mono">
        {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
          <div key={severity} className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-text-3">{severity}</span>
          </div>
        ))}
      </div>

      {/* Commit Modal */}
      {modalData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] rounded-xl border border-glass-border bg-bg-raised p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-1">
                Incident Details
              </h3>
              <button
                onClick={() => setModalData(null)}
                className="text-text-3 hover:text-text-1 text-lg"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-3 uppercase">
                  Date
                </span>
                <span className="text-[12px] font-mono text-text-1">
                  {new Date(modalData.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-3 uppercase">
                  Severity
                </span>
                <span
                  className="text-[12px] font-mono font-bold"
                  style={{
                    color: SEVERITY_COLORS[modalData.severity] || "#fff",
                  }}
                >
                  {modalData.severity}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-3 uppercase block mb-1.5">
                  Commits ({modalData.count})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {modalData.commits.map((hash) => (
                    <code
                      key={hash}
                      className="rounded bg-glass px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-glass-border"
                    >
                      {hash}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
