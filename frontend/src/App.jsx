import React from 'react';
import BlastRadiusGraph from './components/BlastRadiusGraph';
import { blastRadiusData, mergeBadgeData } from './data/mockData';

export default function App() {
  return (
    <div className="app-container">
      {/* ═══ Header ═══ */}
      <header className="app-header animate-in">
        <div className="app-header__brand">
          <div className="app-header__logo">M</div>
          <div>
            <div className="app-header__title">MergeGuard</div>
            <div className="app-header__subtitle">Pre-Merge Intelligence</div>
          </div>
        </div>

        <div className="app-header__meta">
          <div className="app-header__pr-info">
            <div className="app-header__pr-title">{mergeBadgeData.prTitle}</div>
            <div className="app-header__pr-number">
              #{mergeBadgeData.prNumber} · {mergeBadgeData.author} · {new Date(mergeBadgeData.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 3-Panel Grid ═══ */}
      <main className="panels-grid">
        {/* Panel 1 — Blast Radius (full width) */}
        <BlastRadiusGraph data={blastRadiusData} />

        {/* Panel 2 — Post Mortem Timeline (Week 3) */}
        {/* TODO: PostMortemTimeline component */}

        {/* Panel 3 — LLM Risk Analysis (Week 3) */}
        {/* TODO: LLMPanel component */}
      </main>

      {/* ═══ Footer ═══ */}
      <footer style={{
        textAlign: 'center',
        padding: '16px 0',
        fontSize: '0.7rem',
        color: '#475569',
        fontFamily: "'JetBrains Mono', monospace",
        borderTop: '1px solid rgba(99, 102, 241, 0.08)',
      }}>
        MergeGuard v0.1.0 — FOSS Hack 2026 · 100% Open Source · MIT License
      </footer>
    </div>
  );
}
