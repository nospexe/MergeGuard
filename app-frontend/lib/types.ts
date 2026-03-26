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
