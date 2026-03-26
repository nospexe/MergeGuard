import React, { useState, useEffect } from 'react';
import BlastRadiusGraph from './components/BlastRadiusGraph';
import PostMortemTimeline from './components/PostMortemTimeline';
import LLMPanel from './components/LLMPanel';

// Default values for the demo
const DEFAULT_REPO = "c:/Users/gurut/MergeGuard-1";
const DEFAULT_PR = "dev/balaa-frontend";

export default function App() {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO);
  const [prBranch, setPrBranch] = useState(DEFAULT_PR);
  const [baseBranch, setBaseBranch] = useState("main");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [blastData, setBlastData] = useState(null);
  const [postMortem, setPostMortem] = useState(null);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [badgeData, setBadgeData] = useState({
    prTitle: "Scanning Repository...",
    prNumber: "000",
    author: "system",
    timestamp: new Date().toISOString(),
    summary: null
  });

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setLlmAnalysis(null);

    const reqBody = {
      repo_path: repoPath,
      base_branch: baseBranch,
      pr_branch: prBranch
    };

    try {
      const [blastRes, pmRes, recRes] = await Promise.all([
        fetch('/api/blast-radius', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        }),
        fetch('/api/postmortem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        }),
        fetch('/api/recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        })
      ]);

      if (!blastRes.ok || !pmRes.ok || !recRes.ok) {
        throw new Error("One or more analysis engines failed.");
      }

      const bData = await blastRes.json();
      const pData = await pmRes.json();
      const rData = await recRes.json();

      setBlastData(bData);
      setPostMortem(pData);

      setBadgeData(prev => ({
        ...prev,
        prTitle: `PR Analysis: ${prBranch}`,
        summary: {
          filesAffected: bData.nodes.filter(n => n.ring === 0).length,
          dependencyRings: Math.max(...bData.nodes.map(n => n.ring), 0),
          fingerprintsMatched: pData.matches.length,
          avgCoverage: bData.overall_coverage / 100.0,
          criticalPaths: bData.edges.length
        }
      }));

      setLlmAnalysis({
        status: rData.verdict,
        badge: rData.verdict,
        riskScore: bData.risk_score.toFixed(1),
        agents: {
          orchestrator: {
            name: "Final Verdict",
            status: "complete",
            output: rData.summary
          }
        }
      });

      streamLlmAnalysis(reqBody);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const streamLlmAnalysis = async (reqBody) => {
    try {
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (!response.ok) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";

      setLlmAnalysis(prev => ({
        ...prev,
        agents: {
          ...prev.agents,
          deepseek: {
            name: "DeepSeek Architect",
            status: "streaming",
            output: ""
          }
        }
      }));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const token = line.slice(6);
            if (token === '[DONE]') {
              setLlmAnalysis(prev => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  deepseek: { ...prev.agents.deepseek, status: "complete" }
                }
              }));
              break;
            }
            if (token.startsWith('[ERROR]')) {
              setLlmAnalysis(prev => ({
                ...prev,
                agents: {
                  ...prev.agents,
                  deepseek: { ...prev.agents.deepseek, status: "complete", output: token }
                }
              }));
              break;
            }

            streamedContent += token;
            setLlmAnalysis(prev => ({
              ...prev,
              agents: {
                ...prev.agents,
                deepseek: { ...prev.agents.deepseek, output: streamedContent }
              }
            }));
          }
        }
      }
    } catch (_e) {
      // Streaming failed silently — non-critical
    }
  };

  // Run on mount
  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-container">
      {/* ═══ Header ═══ */}
      <header className="app-header animate-fade-in" role="banner">
        <nav aria-label="Main navigation" className="app-header__brand">
          <a href="/" aria-label="MergeGuard home" className="app-header__logo">M</a>
          <div>
            <div className="app-header__title">MergeGuard</div>
            <div className="app-header__subtitle">Pre-Merge Intelligence</div>
          </div>
        </nav>

        <div className="app-header__meta">
          <div className="app-header__pr-info">
            <div className="app-header__pr-title">{badgeData.prTitle}</div>
            <div className="app-header__pr-number">
              #{badgeData.prNumber} · {badgeData.author} · {new Date(badgeData.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Analysis Form ═══ */}
      <div className="app-form animate-fade-in" style={{ animationDelay: '0.1s' }} role="form" aria-label="Analysis configuration">
        <div className="form-group">
          <label htmlFor="repo-path-input">Repository Path</label>
          <input
            id="repo-path-input"
            className="app-input"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="C:/path/to/repo"
          />
        </div>
        <div className="form-group">
          <label htmlFor="pr-branch-input">PR Branch</label>
          <input
            id="pr-branch-input"
            className="app-input"
            value={prBranch}
            onChange={(e) => setPrBranch(e.target.value)}
            placeholder="feature/branch"
          />
        </div>
        <button
          className="app-btn"
          onClick={runAnalysis}
          disabled={isLoading}
          aria-label={isLoading ? 'Analysis in progress' : 'Run intelligence analysis'}
          aria-busy={isLoading}
        >
          {isLoading ? 'Analyzing...' : 'Run Intelligence'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'var(--badge-red-bg)',
            color: 'var(--badge-red)',
            border: '1px solid var(--badge-red)'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ═══ 3-Panel Grid ═══ */}
      <main className="panels-grid" role="main">
        {/* Panel 1 — Blast Radius */}
        <div className="panel blast-radius">
          {!blastData && isLoading ? (
            <div className="panel__content" style={{ padding: 20 }}>
              <div className="skeleton-loader" style={{ height: '400px', width: '100%' }} aria-label="Loading blast radius data" />
            </div>
          ) : blastData ? (
            <BlastRadiusGraph data={blastData} />
          ) : (
            <div className="panel__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
              Awaiting data...
            </div>
          )}
        </div>

        {/* Panel 2 — Post Mortem Timeline */}
        <div className="panel postmortem">
          {!postMortem && isLoading ? (
            <div className="panel__content" style={{ padding: 20 }}>
              <div className="skeleton-loader" style={{ height: '300px', width: '100%' }} aria-label="Loading post mortem data" />
              <div className="skeleton-loader" style={{ height: '50px', width: '100%', marginTop: 20 }} />
              <div className="skeleton-loader" style={{ height: '50px', width: '100%', marginTop: 10 }} />
            </div>
          ) : postMortem ? (
            <PostMortemTimeline data={postMortem} />
          ) : (
            <div className="panel__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
              Awaiting history...
            </div>
          )}
        </div>

        {/* Panel 3 — LLM Risk Analysis */}
        <div className="panel llm-panel">
          {!llmAnalysis && isLoading ? (
            <div className="panel__content" style={{ padding: 20 }}>
              <div className="skeleton-loader" style={{ height: '80px', width: '100%', borderRadius: 16 }} aria-label="Loading LLM analysis" />
              <div className="skeleton-loader" style={{ height: '150px', width: '100%', marginTop: 20 }} />
            </div>
          ) : llmAnalysis ? (
            <LLMPanel data={llmAnalysis} badgeData={badgeData} />
          ) : (
            <div className="panel__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
              Awaiting analysis...
            </div>
          )}
        </div>
      </main>

      {/* ═══ Footer ═══ */}
      <footer
        role="contentinfo"
        style={{
          textAlign: 'center',
          padding: '16px 0',
          fontSize: '0.7rem',
          color: '#475569',
          fontFamily: "'JetBrains Mono', monospace",
          borderTop: '1px solid rgba(99, 102, 241, 0.08)',
        }}
      >
        MergeGuard v0.1.0 — FOSS Hack 2026 · 100% Open Source · MIT License
      </footer>
    </div>
  );
}
