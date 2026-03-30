/**
 * MergeGuard 3-Agent LLM Pipeline
 * ================================
 * Sequential pipeline using local deepseek-coder (or generic API):
 *   Agent 1 (Blast Interpreter)  → structural risk summary
 *   Agent 2 (Pattern Explainer)  → historical context explanation
 *   Agent 3 (Orchestrator)       → final recommendation + risk level
 *
 * Designed for client-side streaming. Each agent's output is streamed
 * token-by-token to the UI via callback.
 */

// ─── Types ──────────────────────────────────────────────

export interface BlastRadiusData {
  nodes: Array<{
    id: string;
    file: string;
    symbol: string;
    coverage_status: string;
    coverage: number;
    functions: string[];
    ring: number;
  }>;
  edges: Array<{ source: string; target: string }>;
  risk_score: number;
  risk_level: string;
  overall_coverage: number;
}

export interface PostMortemData {
  matches: Array<{
    pattern_id: string;
    files: string[];
    support: number;
    confidence: number;
    evidence_commits: string[];
  }>;
  top_risk_files: string[];
  incidents_timeline?: Array<{
    date: string;
    count: number;
    commits: string[];
    severity: string;
  }>;
}

export type RiskLevel = "GREEN" | "YELLOW" | "RED";
export type AgentPhase = "blast_interpreter" | "pattern_explainer" | "orchestrator" | "idle";

export interface PipelineCallbacks {
  onToken: (token: string) => void;
  onPhaseChange: (phase: AgentPhase) => void;
  onRiskLevel: (level: RiskLevel) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

// ─── Prompt Templates ───────────────────────────────────

/**
 * AGENT 1 — Blast Interpreter
 * Input: BlastRadiusData JSON
 * Output: Plain-English structural risk summary
 */
const BLAST_INTERPRETER_PROMPT = `You are Agent 1 (Blast Interpreter) in MergeGuard's analysis pipeline.
Your role: analyze structural dependency data and produce a plain-English risk summary.

RULES:
- Do NOT invent repository facts. Only reference data provided in the input.
- Focus on: number of affected files, coverage gaps, critical dependency paths.
- Identify the highest-risk uncovered paths.
- Use markdown formatting with headers and bullet points.
- Be specific about file names and coverage percentages.
- Keep your analysis to 150-250 words.

INPUT (BlastRadius JSON):
\`\`\`json
{{BLAST_RADIUS_JSON}}
\`\`\`

Produce a structured analysis under the header "### Structural Impact Analysis (BlastRadius)"`;

/**
 * AGENT 2 — Pattern Explainer
 * Input: PostMortemData JSON
 * Output: Historical context explanation
 */
const PATTERN_EXPLAINER_PROMPT = `You are Agent 2 (Pattern Explainer) in MergeGuard's analysis pipeline.
Your role: explain historical failure pattern matches and their significance.

RULES:
- Do NOT invent repository facts. Only reference data provided in the input.
- Explain what each pattern match means in practical terms.
- Highlight the confidence levels and what they imply.
- Reference specific commit hashes from the evidence.
- If no matches exist, explicitly state the code area has no incident history.
- Use markdown formatting with headers and bullet points.
- Keep your analysis to 100-200 words.

INPUT (PostMortem JSON):
\`\`\`json
{{POSTMORTEM_JSON}}
\`\`\`

Produce a structured analysis under the header "### Historical Pattern Analysis (PostMortem)"`;

/**
 * AGENT 3 — Orchestrator
 * Input: Agent 1 output + Agent 2 output
 * Output: Final recommendation + GREEN/YELLOW/RED determination
 */
const ORCHESTRATOR_PROMPT = `You are Agent 3 (Orchestrator) in MergeGuard's analysis pipeline.
Your role: synthesize the structural and historical analyses into a final merge recommendation.

RULES:
- Do NOT invent repository facts. Only reference data from the two agent reports.
- You MUST output exactly one of: GREEN, YELLOW, or RED as the risk level.
- Format your final risk level as: "RISK_LEVEL: GREEN" or "RISK_LEVEL: YELLOW" or "RISK_LEVEL: RED" on its own line at the very end.
- GREEN = safe to merge, minimal risk
- YELLOW = merge with caution, additional review recommended
- RED = block merge, significant risk identified
- Provide specific, actionable recommendations.
- Use markdown formatting.
- Keep the final synthesis to 100-150 words.

AGENT 1 OUTPUT (Structural Analysis):
{{AGENT1_OUTPUT}}

AGENT 2 OUTPUT (Historical Analysis):
{{AGENT2_OUTPUT}}

Produce:
1. A header "### Recommendation" with your synthesis
2. Specific action items as a numbered list
3. End with the exact line: RISK_LEVEL: <GREEN|YELLOW|RED>`;

// ─── Pipeline Execution ─────────────────────────────────

export async function runLLMPipeline(
  blastRadius: BlastRadiusData,
  postMortem: PostMortemData,
  callbacks: PipelineCallbacks
): Promise<{ brief: string; riskLevel: RiskLevel }> {
  const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;

  if (!apiKey) {
    // Demo mode — use precomputed output
    return runDemoPipeline(blastRadius, postMortem, callbacks);
  }

  try {
    let fullOutput = "";

    // ── Agent 1: Blast Interpreter ──
    callbacks.onPhaseChange("blast_interpreter");
    callbacks.onToken("\n## 🔍 Phase 1: Structural Analysis\n\n");
    fullOutput += "\n## 🔍 Phase 1: Structural Analysis\n\n";

    const agent1Prompt = BLAST_INTERPRETER_PROMPT.replace(
      "{{BLAST_RADIUS_JSON}}",
      JSON.stringify(blastRadius, null, 2)
    );

    const agent1Output = await streamLLMCall(apiKey, agent1Prompt, (token) => {
      callbacks.onToken(token);
      fullOutput += token;
    });

    // ── Agent 2: Pattern Explainer ──
    callbacks.onPhaseChange("pattern_explainer");
    callbacks.onToken("\n\n## 📜 Phase 2: Historical Analysis\n\n");
    fullOutput += "\n\n## 📜 Phase 2: Historical Analysis\n\n";

    const agent2Prompt = PATTERN_EXPLAINER_PROMPT.replace(
      "{{POSTMORTEM_JSON}}",
      JSON.stringify(postMortem, null, 2)
    );

    const agent2Output = await streamLLMCall(apiKey, agent2Prompt, (token) => {
      callbacks.onToken(token);
      fullOutput += token;
    });

    // ── Agent 3: Orchestrator ──
    callbacks.onPhaseChange("orchestrator");
    callbacks.onToken("\n\n## ⚖️ Phase 3: Final Recommendation\n\n");
    fullOutput += "\n\n## ⚖️ Phase 3: Final Recommendation\n\n";

    const agent3Prompt = ORCHESTRATOR_PROMPT
      .replace("{{AGENT1_OUTPUT}}", agent1Output)
      .replace("{{AGENT2_OUTPUT}}", agent2Output);

    const agent3Output = await streamLLMCall(apiKey, agent3Prompt, (token) => {
      callbacks.onToken(token);
      fullOutput += token;
    });

    // Extract risk level from Agent 3 output
    const riskLevel = extractRiskLevel(agent3Output);
    callbacks.onRiskLevel(riskLevel);
    callbacks.onComplete();

    return { brief: fullOutput, riskLevel };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    callbacks.onError(message);
    return { brief: "", riskLevel: "RED" };
  }
}

// ─── Generic LLM API Streaming Call ───────────────────────

async function streamLLMCall(
  apiKey: string,
  prompt: string,
  onToken: (token: string) => void
): Promise<string> {
  const response = await fetch("http://localhost:8000/api/llm/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-coder",
      max_tokens: 1024,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            onToken(parsed.delta.text);
            fullText += parsed.delta.text;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }

  return fullText;
}

// ─── Risk Level Extraction ──────────────────────────────

function extractRiskLevel(text: string): RiskLevel {
  const match = text.match(/RISK_LEVEL:\s*(GREEN|YELLOW|RED)/i);
  if (match) {
    return match[1].toUpperCase() as RiskLevel;
  }
  // Fallback heuristics
  if (text.toLowerCase().includes("block") || text.toLowerCase().includes("high risk")) {
    return "RED";
  }
  if (text.toLowerCase().includes("caution") || text.toLowerCase().includes("moderate")) {
    return "YELLOW";
  }
  return "GREEN";
}

// ─── Demo Mode Pipeline ─────────────────────────────────

async function runDemoPipeline(
  blastRadius: BlastRadiusData,
  postMortem: PostMortemData,
  callbacks: PipelineCallbacks
): Promise<{ brief: string; riskLevel: RiskLevel }> {
  const isHighRisk = blastRadius.risk_score > 50;
  const demoOutput = isHighRisk ? DEMO_HIGH_RISK_OUTPUT : DEMO_LOW_RISK_OUTPUT;
  const riskLevel: RiskLevel = isHighRisk ? "RED" : "GREEN";

  let fullOutput = "";

  // Simulate streaming with realistic timing
  const phases: Array<{ phase: AgentPhase; header: string; content: string }> = [
    {
      phase: "blast_interpreter",
      header: "\n## 🔍 Phase 1: Structural Analysis\n\n",
      content: demoOutput.agent1,
    },
    {
      phase: "pattern_explainer",
      header: "\n\n## 📜 Phase 2: Historical Analysis\n\n",
      content: demoOutput.agent2,
    },
    {
      phase: "orchestrator",
      header: "\n\n## ⚖️ Phase 3: Final Recommendation\n\n",
      content: demoOutput.agent3,
    },
  ];

  for (const { phase, header, content } of phases) {
    callbacks.onPhaseChange(phase);
    callbacks.onToken(header);
    fullOutput += header;

    // Stream character by character with variable delay for realism
    const words = content.split(" ");
    for (let i = 0; i < words.length; i++) {
      const word = (i === 0 ? "" : " ") + words[i];
      callbacks.onToken(word);
      fullOutput += word;
      // Variable delay: faster for common words, slower for "important" ones
      const delay = word.includes("**") ? 60 : word.includes("#") ? 80 : 25 + Math.random() * 30;
      await sleep(delay);
    }
  }

  callbacks.onRiskLevel(riskLevel);
  callbacks.onComplete();

  return { brief: fullOutput, riskLevel };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Precomputed Demo Outputs ───────────────────────────

const DEMO_HIGH_RISK_OUTPUT = {
  agent1: `### Structural Impact Analysis (BlastRadius)

The proposed change to \`BaseCache.make_key()\` in \`django/cache/backends/base.py\` has a **blast radius of 23 affected files** across 4 dependency rings.

**Critical findings:**
- **Ring 0 (Modified):** \`base.py\` — the root cache class, coverage only **12%**
- **Ring 1 (Direct dependents):** 5 cache backends affected. \`DatabaseCache\` at **8% coverage**, \`RedisCache\` at **28%**
- **Ring 2 (Transitive):** Session stores (**15% coverage**), template cache (**5%**), cache middleware (**38%**)
- **Ring 3 (Extended):** REST throttling (**10%**), Celery backend (**0%**), auth backends (**55%**)

**Highest-risk uncovered paths:**
- \`base.py → memcached.py → cached_db.py\` — session corruption risk
- \`base.py → redis.py → throttling.py\` — rate limiting failure
- \`base.py → celery/cache.py\` — zero test coverage on async results

Overall blast radius coverage: **38%** — well below the 70% safety threshold.`,

  agent2: `### Historical Pattern Analysis (PostMortem)

**Pattern #P-004 matched with 74% confidence** — this is the strongest match in the analysis.

This pattern involves the exact file combination: \`base.py\`, \`memcached.py\`, and \`cached_db.py\`. Historical evidence from **6 incidents**:
- Commits \`a3f8c91\`, \`b7d2e45\`: P0 production outage — cache key collision caused widespread session corruption
- Commits \`c1f9a23\`, \`d4e5b67\`: Cache invalidation race condition during deployment
- Commits \`e8c2f19\`, \`f6a1d34\`: Memory leak in memcached connection pooling

**Pattern #P-012** (58% confidence) and **Pattern #P-007** (62% confidence) provide additional corroborating signals in the middleware and throttling layers.

The incident timeline shows **accelerating failure frequency** — 3 critical events in the past 12 months, up from 1 in the previous period.`,

  agent3: `### Recommendation

**🔴 BLOCK THIS MERGE** — The combination of wide structural impact and strong historical pattern matches makes this change extremely high-risk.

**Action items:**
1. **Add integration tests** for session store behavior with the new key format — current 15% coverage is unacceptable for a change of this scope
2. **Implement key format migration** — dual-write period where both old and new key formats are supported
3. **Add coverage for throttling.py** (10%) and Celery cache backend (0%) before proceeding
4. **Deploy behind a feature flag** with gradual rollout (1% → 10% → 50% → 100%)
5. **Schedule a design review** with the caching team to validate namespace semantics

The 74% pattern match with P-004 is particularly concerning — this exact file combination has caused production outages before.

RISK_LEVEL: RED`,
};

const DEMO_LOW_RISK_OUTPUT = {
  agent1: `### Structural Impact Analysis (BlastRadius)

The change is limited to a **docstring update** in \`myapp/utils/helpers.py\`.

**Impact summary:**
- **Affected files:** 1
- **Downstream dependencies:** 0
- **Function:** \`format_date()\` — test coverage at **92%**
- **Change type:** Documentation only — no executable code modified

No dependency paths are affected. The blast radius is minimal.`,

  agent2: `### Historical Pattern Analysis (PostMortem)

**No fingerprint matches found.** This file (\`myapp/utils/helpers.py\`) has no history of being involved in production incidents.

The \`format_date()\` function has been stable across all historical commits analyzed. No patterns of concern detected.`,

  agent3: `### Recommendation

**🟢 SAFE TO MERGE** — This is a documentation-only change with zero structural impact.

**Summary:**
1. No executable code modified
2. Function has 92% test coverage
3. No historical incident patterns
4. No downstream dependencies affected

No additional review or testing required. Auto-merge eligible.

RISK_LEVEL: GREEN`,
};
