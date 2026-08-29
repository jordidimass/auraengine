import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const insertSteal = mutation({
  args: {
    competitorPostId: v.id("competitor_posts"),
    auraOpportunityScore: v.number(),
    targetWeakness: v.string(),
    generatedResponse: v.string(),
    audioUrl: v.optional(v.string()),
    projectedAuraGain: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.competitorPostId, { status: "ready" });
    return await ctx.db.insert("aura_steals", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
