import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  competitor_posts: defineTable({
    competitorName: v.string(),
    originalPostUrl: v.string(),
    originalContent: v.string(),
    metrics: v.object({
      likes: v.number(),
      reposts: v.number(),
    }),
    status: v.union(
      v.literal("detected"),
      v.literal("analyzing"),
      v.literal("ready"),
      v.literal("stolen"),
    ),
    createdAt: v.number(),
  }),

  aura_steals: defineTable({
    competitorPostId: v.id("competitor_posts"),
    auraOpportunityScore: v.number(), // 0-100
    targetWeakness: v.string(),
    generatedResponse: v.string(),
    audioUrl: v.optional(v.string()),
    projectedAuraGain: v.number(),
    createdAt: v.number(),
  }).index("by_post", ["competitorPostId"]),
});
