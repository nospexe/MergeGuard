export type Verdict = "critical" | "warning" | "passed";

export type NavItem = {
    label: string;
    href: string;
    icon: string;
};

export type MetricColor = "blue" | "red" | "green" | "default";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export type BadgeVariant =
    | "critical"
    | "warning"
    | "passed"
    | "info"
    | "scanning";

export interface RiskItem {
    id: string;
    magnitude: number;
    summary: string;
    verdict: Verdict;
}

export interface MetricCardData {
    label: string;
    value: string | number;
    sub?: string;
    color?: MetricColor;
}

export interface EngineStatus {
    name: string;
    submodel: string;
    temp: number;
    tokensPerSec: number;
    status: "ready" | "loading" | "error";
}

export interface GitMinerStatus {
    progress: number;
    statusLine: string;
}

export interface AnomalyData {
    title: string;
    body: string;
}

export interface FeatureCard {
    icon: string;
    title: string;
    description: string;
    tags?: string[];
    badge?: string;
}

/* ── Backend API types ── */
export interface AnalyzeRequest {
    repo_path: string;
    base_branch: string;
    pr_branch: string;
}

export interface BlastRadiusNode {
    id: string;
    file: string;
    symbol: string;
    coverage_status: string;
    coverage: number;
    functions: string[];
    ring: number;
}

export interface BlastRadiusEdge {
    source: string;
    target: string;
}

export interface BlastRadiusResponse {
    nodes: BlastRadiusNode[];
    edges: BlastRadiusEdge[];
    risk_score: number;
    risk_level: string;
    overall_coverage: number;
}

export interface FingerprintMatch {
    pattern_id: string;
    files: string[];
    support: number;
    confidence: number;
    evidence_commits: string[];
}

export interface PostMortemResponse {
    matches: FingerprintMatch[];
    top_risk_files: string[];
}

export interface RecommendationResponse {
    verdict: string;
    summary: string;
    blast_risk: string;
    pattern_risk: string;
}
