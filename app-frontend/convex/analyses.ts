import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ────────────────────────────────────────────

export const list = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("analyses")
        .withIndex("by_user", (q) => q.eq("userId", args.userId as string))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("analyses").order("desc").take(50);
  },
});

export const getById = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("analyses")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

// ─── Mutations ──────────────────────────────────────────

export const create = mutation({
  args: {
    repoName: v.string(),
    branch: v.string(),
    diff: v.string(),
    blastRadius: v.string(),
    postMortem: v.string(),
    llmBrief: v.string(),
    riskLevel: v.union(
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED")
    ),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("analyses", {
      ...args,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const updateLLMBrief = mutation({
  args: {
    id: v.id("analyses"),
    llmBrief: v.string(),
    riskLevel: v.union(
      v.literal("GREEN"),
      v.literal("YELLOW"),
      v.literal("RED")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      llmBrief: args.llmBrief,
      riskLevel: args.riskLevel,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
