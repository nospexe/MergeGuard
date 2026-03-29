import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  analyses: defineTable({
    repoName: v.string(),
    branch: v.string(),
    diff: v.string(),
    blastRadius: v.string(), // JSON stringified BlastRadiusData
    postMortem: v.string(), // JSON stringified PostMortemData
    llmBrief: v.string(),
    riskLevel: v.union(
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED")
    ),
    createdAt: v.number(),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  fingerprints: defineTable({
    patternId: v.string(),
    filesInvolved: v.array(v.string()),
    support: v.number(),
    confidence: v.number(),
    evidenceCommits: v.array(v.string()),
    timestampRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  }).index("by_pattern", ["patternId"]),

  // Streaming LLM output — each analysis gets tokens appended in real-time
  llmStreams: defineTable({
    analysisId: v.optional(v.id("analyses")),
    sessionId: v.string(), // client-generated session ID for streaming before analysis is saved
    tokens: v.string(), // accumulated tokens
    riskLevel: v.union(
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED"),
      v.literal("PENDING")
    ),
    isComplete: v.boolean(),
    agentPhase: v.union(
      v.literal("blast_interpreter"),
      v.literal("pattern_explainer"),
      v.literal("orchestrator"),
      v.literal("idle")
    ),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
