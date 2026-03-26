import type {
    AnalyzeRequest,
    BlastRadiusResponse,
    PostMortemResponse,
    RecommendationResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`API ${res.status}: ${detail}`);
    }
    return res.json();
}

export async function healthCheck(): Promise<{ status: string; version: string }> {
    return apiFetch("/health");
}

export async function getBlastRadius(req: AnalyzeRequest): Promise<BlastRadiusResponse> {
    return apiFetch("/api/blast-radius", req);
}

export async function getPostMortem(req: AnalyzeRequest): Promise<PostMortemResponse> {
    return apiFetch("/api/postmortem", req);
}

export async function getRecommendation(req: AnalyzeRequest): Promise<RecommendationResponse> {
    return apiFetch("/api/recommendation", req);
}

export async function* streamAnalysis(req: AnalyzeRequest): AsyncGenerator<string> {
    const res = await fetch(`${API_BASE}/api/analyze/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });

    if (!res.ok) throw new Error(`Stream failed: ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                yield line.slice(6);
            }
        }
    }
}
