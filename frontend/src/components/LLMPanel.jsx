import React, { useState } from 'react';

/**
 * LLMPanel — Week 3 Panel
 *
 * Displays the multi-agent LLM analysis output:
 * - Merge badge with color-coded risk indicator
 * - Collapsible agent output sections with parsed markdown
 * - Stats summary chips
 */

// Simple markdown-to-JSX renderer (handles h2, h3, h4, p, code, bold, lists, hr)
function MarkdownRenderer({ source }) {
  const lines = source.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(<ol key={key++}>{listItems.map((li, idx) => <li key={idx}>{renderInline(li)}</li>)}</ol>);
      } else {
        elements.push(<ul key={key++}>{listItems.map((li, idx) => <li key={idx}>{renderInline(li)}</li>)}</ul>);
      }
      listItems = [];
      listType = null;
    }
  };

  const renderInline = (text) => {
    if (!text) return text;
    const parts = [];
    let lastIdx = 0;
    const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
    let match;
    let pKey = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(<span key={pKey++}>{text.slice(lastIdx, match.index)}</span>);
      }
      if (match[1]) {
        parts.push(<strong key={pKey++}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<code key={pKey++}>{match[4]}</code>);
      }
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      parts.push(<span key={pKey++}>{text.slice(lastIdx)}</span>);
    }
    return parts.length > 0 ? parts : text;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={key++}>{renderInline(line.slice(3))}</h2>);
      i++;
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      elements.push(<h4 key={key++}>{renderInline(line.slice(5))}</h4>);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={key++}>{renderInline(line.slice(4))}</h3>);
      i++;
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      i++;
      continue;
    }

    if (line.match(/^[-*]\s+(.*)/)) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(line.replace(/^[-*]\s+/, ''));
      i++;
      continue;
    }

    if (line.match(/^---+$/)) {
      flushList();
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />);
      i++;
      continue;
    }

    flushList();
    elements.push(<p key={key++}>{renderInline(line)}</p>);
    i++;
  }

  flushList();
  return <>{elements}</>;
}

export default function LLMPanel({ data, badgeData }) {
  const [expandedAgents, setExpandedAgents] = useState({
    orchestrator: true,
  });

  if (!data) return null;

  const toggleAgent = (agentKey) => {
    setExpandedAgents(prev => ({
      ...prev,
      [agentKey]: !prev[agentKey],
    }));
  };

  const agentIcons = {
    blastRadiusInterpreter: '🔬',
    patternExplainer: '🧬',
    orchestrator: '🤖',
  };

  const badgeColor = (badge) => {
    switch (badge) {
      case 'GREEN': return 'var(--badge-green)';
      case 'YELLOW': return 'var(--badge-yellow)';
      case 'RED': return 'var(--badge-red)';
      default: return 'var(--text-muted)';
    }
  };

  const badgeLabel = (badge) => {
    switch (badge) {
      case 'GREEN': return 'Safe to Merge';
      case 'YELLOW': return 'Merge with Caution';
      case 'RED': return 'Do Not Merge';
      default: return 'Unknown';
    }
  };

  const badgeIcon = (badge) => {
    switch (badge) {
      case 'GREEN': return '✓';
      case 'YELLOW': return '⚠';
      case 'RED': return '✕';
      default: return '?';
    }
  };

  return (
    <section className="panel llm-panel animate-scale-in animate-delay-4" aria-label="LLM risk analysis">
      <div className="panel__header">
        <div className="panel__title">
          <span className="panel__title-icon" aria-hidden="true">🧠</span>
          LLM Risk Analysis
        </div>
        <span className="panel__badge" style={{
          background: data.badge === 'GREEN'
            ? 'var(--badge-green-bg)'
            : data.badge === 'YELLOW'
              ? 'var(--badge-yellow-bg)'
              : 'var(--badge-red-bg)',
          color: badgeColor(data.badge),
        }}>
          {data.status}
        </span>
      </div>

      <div className="panel__content">
        {/* ─── Merge Badge ─── */}
        <div
          className={`merge-badge merge-badge--${data.badge}`}
          role="status"
          aria-label={`Merge verdict: ${badgeLabel(data.badge)}, risk score ${data.riskScore}`}
        >
          <div className="merge-badge__indicator" aria-hidden="true">
            {badgeIcon(data.badge)}
          </div>
          <div className="merge-badge__info">
            <span className="merge-badge__label">Merge Verdict</span>
            <span className="merge-badge__verdict">
              {badgeLabel(data.badge)}
            </span>
          </div>
          <div className="merge-badge__score" aria-label={`Risk score: ${data.riskScore}`}>
            {data.riskScore}
          </div>
        </div>

        {/* ─── Stats Summary ─── */}
        {badgeData?.summary && (
          <div className="stats-row" style={{ marginTop: 16, marginBottom: 16 }} role="list" aria-label="Analysis summary statistics">
            <div className="stat-chip" role="listitem">
              <span aria-hidden="true">📁</span> <span className="stat-chip__value">{badgeData.summary.filesAffected}</span> files affected
            </div>
            <div className="stat-chip" role="listitem">
              <span aria-hidden="true">🎯</span> <span className="stat-chip__value">{badgeData.summary.dependencyRings}</span> rings deep
            </div>
            <div className="stat-chip" role="listitem">
              <span aria-hidden="true">🧬</span> <span className="stat-chip__value">{badgeData.summary.fingerprintsMatched}</span> fingerprints
            </div>
            <div className="stat-chip" role="listitem">
              <span aria-hidden="true">📊</span> <span className="stat-chip__value">{Math.round(badgeData.summary.avgCoverage * 100)}%</span> avg coverage
            </div>
            <div className="stat-chip" role="listitem">
              <span aria-hidden="true">⚠️</span> <span className="stat-chip__value">{badgeData.summary.criticalPaths}</span> critical paths
            </div>
          </div>
        )}

        {/* ─── Agent Outputs ─── */}
        <div className="llm-panel__agents">
          {Object.entries(data.agents).map(([agentKey, agent]) => (
            <div className="llm-agent" key={agentKey}>
              <button
                className="llm-agent__header"
                onClick={() => toggleAgent(agentKey)}
                aria-expanded={!!expandedAgents[agentKey]}
                aria-controls={`agent-body-${agentKey}`}
                aria-label={`${agent.name} — ${agent.status === 'complete' ? 'complete' : 'streaming'}`}
                type="button"
              >
                <div className="llm-agent__name">
                  <span aria-hidden="true">{agentIcons[agentKey] || '🤖'}</span>
                  {agent.name}
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {expandedAgents[agentKey] ? '▼' : '▶'}
                  </span>
                </div>
                <span
                  className={`llm-agent__status llm-agent__status--${agent.status}`}
                  aria-label={agent.status === 'complete' ? 'Status: complete' : 'Status: streaming'}
                >
                  {agent.status === 'complete' ? '✓ complete' : '⟳ streaming'}
                </span>
              </button>
              <div
                id={`agent-body-${agentKey}`}
                className={`llm-agent__body ${expandedAgents[agentKey] ? 'expanded' : ''}`}
                role="region"
                aria-hidden={!expandedAgents[agentKey]}
              >
                <MarkdownRenderer source={agent.output} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
