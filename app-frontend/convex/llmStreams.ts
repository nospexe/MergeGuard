import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("llmStreams")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const create = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("llmStreams", {
      sessionId: args.sessionId,
      tokens: "",
      riskLevel: "PENDING",
      isComplete: false,
      agentPhase: "idle",
      updatedAt: Date.now(),
    });
  },
});

export const appendTokens = mutation({
  args: {
    sessionId: v.string(),
    tokens: v.string(),
    agentPhase: v.optional(
      v.union(
        v.literal("blast_interpreter"),
        v.literal("pattern_explainer"),
        v.literal("orchestrator"),
        v.literal("idle")
      )
    ),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("llmStreams")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!stream) return;
    const patch: Record<string, unknown> = {
      tokens: stream.tokens + args.tokens,
      updatedAt: Date.now(),
    };
    if (args.agentPhase) {
      patch.agentPhase = args.agentPhase;
    }
    await ctx.db.patch(stream._id, patch);
  },
});

export const complete = mutation({
  args: {
    sessionId: v.string(),
    riskLevel: v.union(
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED")
    ),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("llmStreams")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!stream) return;
    await ctx.db.patch(stream._id, {
      isComplete: true,
      riskLevel: args.riskLevel,
      agentPhase: "idle",
      updatedAt: Date.now(),
    });
  },
});
