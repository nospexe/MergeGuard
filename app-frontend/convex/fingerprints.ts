import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
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
    filesInvolved: v.array(v.string()),
    support: v.number(),
    confidence: v.number(),
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
