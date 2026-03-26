import type {
    RiskItem,
    MetricCardData,
    EngineStatus,
    GitMinerStatus,
    AnomalyData,
    FeatureCard,
} from "@/lib/types";

export const riskItems: RiskItem[] = [
    {
        id: "#MG-8842",
        magnitude: 82,
        summary: "Potential logic bomb detected in auth middleware chain",
        verdict: "critical",
    },
    {
        id: "#MG-8840",
        magnitude: 12,
        summary: "Routine dependency bump for lodash@4.17.21",
        verdict: "passed",
    },
    {
        id: "#MG-8839",
        magnitude: 44,
        summary: "Unusual pattern in SQL query builder refactor",
        verdict: "warning",
    },
    {
        id: "#MG-8835",
        magnitude: 8,
        summary: "Documentation updates for API v2 endpoints",
        verdict: "passed",
    },
];

export const metrics: MetricCardData[] = [
    {
        label: "Active PRs",
        value: 42,
        sub: "+3 since peak",
        color: "blue",
    },
    {
        label: "Critical Risks",
        value: 7,
        sub: "Action req.",
        color: "red",
    },
    {
        label: "Pattern Confidence",
        value: "98.4%",
        sub: "Ollama-v1.4",
        color: "default",
    },
];

export const engineStatus: EngineStatus = {
    name: "Ollama-v1.4",
    submodel: "llama3:70b-instruct-q4_K_M",
    temp: 42,
    tokensPerSec: 142.4,
    status: "ready",
};

export const gitMiner: GitMinerStatus = {
    progress: 82,
    statusLine: "Scanning remote refs/heads/main...",
};

export const systemPulse: number[] = [
    40, 55, 30, 70, 45, 80, 35, 65, 50, 75, 42, 68,
];

export const anomaly: AnomalyData = {
    title: "Anomaly Detected",
    body: "Unusual surge in PR deletions from unauthorized dev branch. Checking signatures...",
};

export const featureCards: FeatureCard[] = [
    {
        icon: "BarChart2",
        title: "Blast Radius",
        description:
            "Symbol-level dependency analysis that traces the impact of every character change across your entire microservices architecture.",
        tags: ["blast-impact: 74%", "ref-chains: 12x", "diff-impact: 9"],
    },
    {
        icon: "Brain",
        title: "LLM Reasoning",
        description:
            "Local AI that doesn't just find bugs, but suggests the exact refactor path to avoid regressions.",
        badge: "PRIVACY FOCUSED · LOCAL ONLY",
    },
    {
        icon: "Clock",
        title: "PostMortem",
        description:
            "Historical failure pattern mining. Our engine learns from your previous incidents to block merges that resemble past architectural catastrophes.",
        tags: [
            "Pattern Matching v4.1 Active",
            "Historical regression database synced",
        ],
    },
];
