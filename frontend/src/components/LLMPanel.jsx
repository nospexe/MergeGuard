import React, { useState, useEffect, useRef } from 'react';

/**
 * LLMPanel — 3-Agent LLM Pipeline Display
 *
 * Shows the output of the three LangGraph agents:
 * 1. Blast Radius Interpreter
 * 2. Pattern Explainer
 * 3. Merge Orchestrator
 *
 * Simulates word-by-word streaming (SSE-style) on mount.
 */

const agentIcons = {
  blastRadiusInterpreter: '🎯',
  patternExplainer: '🧬',
  orchestrator: '🤖',
};

const agentOrder = ['blastRadiusInterpreter', 'patternExplainer', 'orchestrator'];

function parseMarkdown(text) {
  // Simple markdown → HTML for display
  let html = text
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Ordered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Unordered lists
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

function StreamingText({ text, speed = 8, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setIsDone(false);

    const interval = setInterval(() => {
      // Add characters in chunks for faster streaming
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      const next = text.slice(i, i + chunkSize);
      i += chunkSize;

      setDisplayed(prev => prev + next);

      // Auto-scroll
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }

      if (i >= text.length) {
        clearInterval(interval);
        setIsDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <div ref={containerRef}>
      <div dangerouslySetInnerHTML={{ __html: parseMarkdown(displayed) }} />
      {!isDone && (
        <span style={{
          display: 'inline-block',
          width: 6,
          height: 14,
          background: '#06b6d4',
          marginLeft: 2,
          borderRadius: 1,
          animation: 'pulse-status 0.8s ease-in-out infinite',
          verticalAlign: 'text-bottom',
        }} />
      )}
    </div>
  );
}

export default function LLMPanel({ data }) {
  const [expandedAgent, setExpandedAgent] = useState('orchestrator');
  const [streamingComplete, setStreamingComplete] = useState({});

  if (!data) return null;

  const { agents } = data;

  return (
    <div className="panel llm-panel animate-in animate-delay-3">
      <div className="panel__header">
        <div className="panel__title">
          <span className="panel__title-icon">🧠</span>
          LLM Risk Analysis
        </div>
        <span className="panel__badge" style={{
          background: data.badge === 'GREEN' ? 'rgba(16, 185, 129, 0.12)'
            : data.badge === 'YELLOW' ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(244, 63, 94, 0.12)',
          color: data.badge === 'GREEN' ? '#10b981'
            : data.badge === 'YELLOW' ? '#f59e0b'
              : '#f43f5e',
        }}>
          Risk Score: {data.riskScore}/100
        </span>
      </div>

      <div className="panel__content">
        <div className="llm-panel__agents">
          {agentOrder.map((key, index) => {
            const agent = agents[key];
            const isExpanded = expandedAgent === key;
            const icon = agentIcons[key];

            return (
              <div key={key} className="llm-agent" style={{ animationDelay: `${index * 100}ms` }}>
                <div
                  className="llm-agent__header"
                  onClick={() => setExpandedAgent(isExpanded ? null : key)}
                >
                  <div className="llm-agent__name">
                    <span>{icon}</span>
                    {agent.name}
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 400 }}>
                      Agent {index + 1}/3
                    </span>
                  </div>
                  <span className={`llm-agent__status llm-agent__status--${
                    streamingComplete[key] ? 'complete' : isExpanded ? 'streaming' : agent.status
                  }`}>
                    {streamingComplete[key] ? '✓ complete' : isExpanded && !streamingComplete[key] ? '● streaming' : agent.status}
                  </span>
                </div>

                <div className={`llm-agent__body ${isExpanded ? 'expanded' : ''}`}>
                  {isExpanded && (
                    <StreamingText
                      text={agent.output}
                      speed={3}
                      onComplete={() => setStreamingComplete(prev => ({ ...prev, [key]: true }))}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 16,
          padding: '10px 0',
        }}>
          {agentOrder.map((key, i) => (
            <React.Fragment key={key}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: streamingComplete[key] ? '#10b981' : expandedAgent === key ? '#06b6d4' : '#334155',
                boxShadow: streamingComplete[key] ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 300ms ease-out',
              }} />
              {i < agentOrder.length - 1 && (
                <div style={{
                  width: 32,
                  height: 1,
                  background: streamingComplete[key] ? '#10b981' : '#334155',
                  transition: 'all 300ms ease-out',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '0.68rem',
          color: '#64748b',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          LangGraph Pipeline — Ollama · DeepSeek Coder 6.7B
        </div>
      </div>
    </div>
  );
}
