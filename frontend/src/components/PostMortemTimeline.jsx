import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

export default function PostMortemTimeline({ data }) {
  const [expandedCard, setExpandedCard] = useState(null);

  if (!data) return null;

  const fingerprints = data.matches || [];
  const timeline = data.timeline || [];

  // Enrich timeline with month labels
  const chartData = (timeline || []).map((entry) => {
    const d = new Date(entry.date);
    return {
      ...entry,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    };
  });

  // Severity colour map
  const severityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'var(--severity-critical)';
      case 'high':
        return 'var(--severity-high)';
      case 'medium':
        return 'var(--severity-medium)';
      case 'low':
        return 'var(--severity-low)';
      default:
        return 'var(--text-muted)';
    }
  };

  // Severity icon
  const severityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '⚪';
      default:
        return '⚪';
    }
  };

  // Custom tooltip for chart
  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0]?.payload;
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: '0.78rem',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {entry?.date}
        </div>
        <div style={{ color: 'var(--accent-rose)', marginBottom: 2 }}>
          Bugs: <strong>{entry?.bugs}</strong>
        </div>
        <div style={{ color: 'var(--accent-cyan)' }}>
          Commits: <strong>{entry?.commits}</strong>
        </div>
        {entry?.fingerprint && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid var(--border-subtle)',
              color: 'var(--accent-amber)',
              fontSize: '0.72rem',
            }}
          >
            🔗 {entry.fingerprint}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className="panel postmortem animate-fade-in animate-delay-2"
      aria-label="Post mortem timeline analysis"
    >
      <div className="panel__header">
        <div className="panel__title">
          <span className="panel__title-icon" aria-hidden="true">
            🕵️
          </span>
          Post Mortem Timeline
        </div>
        <span
          className="panel__badge"
          style={{
            background: 'rgba(249, 115, 22, 0.12)',
            color: '#fb923c',
          }}
        >
          {(fingerprints || []).length} fingerprints
        </span>
      </div>

      <div className="panel__content">
        {/* ─── Bug/Commit Timeline Chart ─── */}
        {chartData.length > 0 && (
          <div
            className="postmortem__chart"
            role="img"
            aria-label="Bug and commit timeline chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bugGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent-rose)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-rose)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="commitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--accent-cyan)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-cyan)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="var(--accent-cyan)"
                  strokeWidth={1.5}
                  fill="url(#commitGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: 'var(--accent-cyan)',
                    strokeWidth: 2,
                    fill: 'var(--bg-primary)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bugs"
                  stroke="var(--accent-rose)"
                  strokeWidth={2}
                  fill="url(#bugGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: 'var(--accent-rose)',
                    strokeWidth: 2,
                    fill: 'var(--bg-primary)',
                  }}
                />
                {chartData
                  .filter((e) => e.fingerprint)
                  .map((entry, i) => (
                    <ReferenceDot
                      key={i}
                      x={entry.label}
                      y={entry.bugs}
                      r={6}
                      fill="var(--accent-amber)"
                      stroke="var(--bg-primary)"
                      strokeWidth={2}
                    />
                  ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ─── Chart Legend ─── */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 16,
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}
          aria-label="Chart legend"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 3,
                background: 'var(--accent-rose)',
                borderRadius: 2,
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            Bugs
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 3,
                background: 'var(--accent-cyan)',
                borderRadius: 2,
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            Commits
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                background: 'var(--accent-amber)',
                borderRadius: '50%',
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            Fingerprint Match
          </span>
        </div>

        {/* ─── Fingerprint Cards ─── */}
        <div
          className="fingerprint-list"
          role="list"
          aria-label="Detected fingerprint patterns"
        >
          {(fingerprints || []).map((fp, index) => (
            <div
              key={fp.id}
              className={`fingerprint-card animate-fade-in animate-row-${Math.min(index + 1, 6)}`}
              onClick={() =>
                setExpandedCard(expandedCard === fp.id ? null : fp.id)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedCard(expandedCard === fp.id ? null : fp.id);
                }
              }}
              role="listitem"
              tabIndex={0}
              aria-expanded={expandedCard === fp.id}
              aria-label={`${fp.name}, severity ${fp.severity}, confidence ${Math.round(fp.confidence * 100)}%`}
              style={{
                borderColor:
                  expandedCard === fp.id
                    ? severityColor(fp.severity) + '60'
                    : undefined,
              }}
            >
              <div className="fingerprint-card__header">
                <span className="fingerprint-card__id">{fp.id}</span>
                <span
                  className={`fingerprint-card__severity fingerprint-card__severity--${fp.severity}`}
                >
                  <span aria-hidden="true">{severityIcon(fp.severity)}</span>{' '}
                  {fp.severity}
                </span>
              </div>

              <div className="fingerprint-card__name">{fp.name}</div>

              <div className="fingerprint-card__desc">{fp.description}</div>

              {/* Confidence bar */}
              <div
                className="fingerprint-card__confidence-bar"
                role="progressbar"
                aria-valuenow={Math.round(fp.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Confidence: ${Math.round(fp.confidence * 100)}%`}
              >
                <div
                  className="fingerprint-card__confidence-fill"
                  style={{
                    width: `${fp.confidence * 100}%`,
                    background: severityColor(fp.severity),
                  }}
                />
              </div>

              <div className="fingerprint-card__footer">
                <span>
                  Confidence:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {Math.round(fp.confidence * 100)}%
                  </strong>
                </span>
                <span>
                  Occurrences:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {fp.occurrences}
                  </strong>
                </span>
                <span>
                  Last:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {fp.lastSeen}
                  </strong>
                </span>
              </div>

              {/* Expanded detail */}
              {expandedCard === fp.id && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    animation: 'fadeIn 250ms ease-out',
                  }}
                >
                  <div className="fingerprint-card__rule">{fp.rule}</div>
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {fp.relatedFiles.map((file) => (
                      <span
                        key={file}
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          borderRadius: 'var(--radius-full)',
                          color: 'var(--text-accent)',
                        }}
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
