import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts';

/**
 * PostMortemTimeline — Recharts Area + Fingerprint Cards
 *
 * Top: area chart showing bugs vs commits over time, with markers for fingerprint matches
 * Bottom: scrollable list of Failure Fingerprint cards
 */

const severityColors = {
  critical: '#f43f5e',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.75rem',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#a5b4fc', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: '#f43f5e' }}>Bugs: {data.bugs}</div>
      <div style={{ color: '#94a3b8' }}>Commits: {data.commits}</div>
      {data.fingerprint && (
        <div style={{ color: '#f59e0b', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>
          🔍 {data.fingerprint}
        </div>
      )}
    </div>
  );
}

export default function PostMortemTimeline({ data }) {
  const [expandedFp, setExpandedFp] = useState(null);
  const [hoveredFp, setHoveredFp] = useState(null);

  if (!data) return null;

  const chartData = data.timeline.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  const bugDots = chartData.filter(d => d.bugs > 0 && d.fingerprint);

  return (
    <div className="panel postmortem animate-in animate-delay-2">
      <div className="panel__header">
        <div className="panel__title">
          <span className="panel__title-icon">🔬</span>
          Post Mortem Timeline
        </div>
        <span className="panel__badge" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
          {data.fingerprints.length} fingerprints
        </span>
      </div>

      <div className="panel__content">
        {/* ─── Timeline Chart ─── */}
        <div className="postmortem__chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="bugGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.08)" />
              <XAxis 
                dataKey="dateLabel" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="commits"
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#commitGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="bugs"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#bugGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1 }}
              />
              {/* Fingerprint markers */}
              {bugDots.map((d, i) => (
                <ReferenceDot
                  key={i}
                  x={d.dateLabel}
                  y={d.bugs}
                  r={6}
                  fill={d.fingerprint && hoveredFp === d.fingerprint ? '#f59e0b' : '#f43f5e'}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(244, 63, 94, 0.5))' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─── Fingerprint Cards ─── */}
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Failure Fingerprint Library
        </div>
        <div className="fingerprint-list">
          {data.fingerprints.map(fp => (
            <div
              key={fp.id}
              className="fingerprint-card"
              style={{
                borderColor: hoveredFp === fp.id ? severityColors[fp.severity] + '50' : undefined,
              }}
              onMouseEnter={() => setHoveredFp(fp.id)}
              onMouseLeave={() => setHoveredFp(null)}
              onClick={() => setExpandedFp(prev => prev === fp.id ? null : fp.id)}
            >
              <div className="fingerprint-card__header">
                <span className="fingerprint-card__id">{fp.id}</span>
                <span className={`fingerprint-card__severity fingerprint-card__severity--${fp.severity}`}>
                  {fp.severity}
                </span>
              </div>
              <div className="fingerprint-card__name">{fp.name}</div>
              <div className="fingerprint-card__desc">{fp.description}</div>

              {expandedFp === fp.id && (
                <div style={{ animation: 'fadeIn 200ms ease-out' }}>
                  <div className="fingerprint-card__rule">{fp.rule}</div>
                  <div className="fingerprint-card__footer">
                    <span>📊 {fp.occurrences} occurrences</span>
                    <span>📅 Last: {fp.lastSeen}</span>
                    <span>📁 {fp.relatedFiles.length} files</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {fp.relatedFiles.map(f => (
                      <span key={f} style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.68rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 4,
                        padding: '1px 6px',
                        color: '#a5b4fc',
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence bar */}
              <div className="fingerprint-card__confidence-bar">
                <div
                  className="fingerprint-card__confidence-fill"
                  style={{
                    width: `${fp.confidence * 100}%`,
                    background: severityColors[fp.severity],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
