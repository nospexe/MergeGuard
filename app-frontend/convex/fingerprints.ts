import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { repoPath: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.repoPath) {
      return await ctx.db
        .query("fingerprints")
        .withIndex("by_repo", (q) => q.eq("repoPath", args.repoPath!))
        .collect();
    }
    return await ctx.db.query("fingerprints").collect();
  },
});

export const getByPattern = query({
  args: { patternId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fingerprints")
      .withIndex("by_pattern", (q) => q.eq("patternId", args.patternId))
      .first();
  },
});

export const create = mutation({
  args: {
    patternId: v.string(),
    repoPath: v.string(),
    filesInvolved: v.array(v.string()),
    antecedents: v.array(v.string()),
    consequents: v.array(v.string()),
    support: v.number(),
    confidence: v.number(),
    lift: v.number(),
    evidenceCommits: v.array(v.string()),
    timestampRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fingerprints", args);
  },
});
