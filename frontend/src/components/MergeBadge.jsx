import React from 'react';

/**
 * MergeBadge — GREEN / YELLOW / RED verdict display
 *
 * Shows the overall merge recommendation with:
 * - Pulsing colour indicator
 * - Risk score
 * - Summary stats
 */

const verdictText = {
  GREEN: 'Safe to Merge',
  YELLOW: 'Merge with Caution',
  RED: 'Do Not Merge',
};

const verdictIcon = {
  GREEN: '✓',
  YELLOW: '⚠',
  RED: '✕',
};

export default function MergeBadge({ data }) {
  if (!data) return null;

  const { badge, riskScore, summary } = data;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ─── Main Badge ─── */}
      <div className={`merge-badge merge-badge--${badge}`}>
        <div className="merge-badge__indicator">
          {verdictIcon[badge]}
        </div>
        <div className="merge-badge__info">
          <span className="merge-badge__label">Merge Recommendation</span>
          <span className="merge-badge__verdict">{verdictText[badge]}</span>
        </div>
        <div className="merge-badge__score">{riskScore}</div>
      </div>

      {/* ─── Stats Chips ─── */}
      <div className="stats-row">
        <div className="stat-chip">
          <span>📁</span>
          <span className="stat-chip__value">{summary.filesAffected}</span>
          <span>files affected</span>
        </div>
        <div className="stat-chip">
          <span>🔗</span>
          <span className="stat-chip__value">{summary.dependencyRings}</span>
          <span>dep rings</span>
        </div>
        <div className="stat-chip">
          <span>🔍</span>
          <span className="stat-chip__value">{summary.fingerprintsMatched}</span>
          <span>fingerprints</span>
        </div>
        <div className="stat-chip">
          <span>📊</span>
          <span className="stat-chip__value">{Math.round(summary.avgCoverage * 100)}%</span>
          <span>avg coverage</span>
        </div>
        <div className="stat-chip">
          <span>⚡</span>
          <span className="stat-chip__value">{summary.criticalPaths}</span>
          <span>critical paths</span>
        </div>
      </div>
    </div>
  );
}
