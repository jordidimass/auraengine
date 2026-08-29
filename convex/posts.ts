import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listPendingSteals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("competitor_posts")
      .filter((q) => q.eq(q.field("status"), "ready"))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const insertCompetitorPost = mutation({
  args: {
    competitorName: v.string(),
    originalPostUrl: v.string(),
    originalContent: v.string(),
    metrics: v.object({
      likes: v.number(),
      reposts: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("competitor_posts", {
      ...args,
      status: "detected",
      createdAt: Date.now(),
    });
  },
});

export const markAsStolen = mutation({
  args: { id: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "stolen" });
  },
});
