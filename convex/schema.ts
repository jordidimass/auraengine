import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  assetStatusValidator,
  competitorPostStatusValidator,
  designTokensValidator,
  platformValidator,
  publicationModeValidator,
  publicationStatusValidator,
  socialAccountStatusValidator,
  toneValidator,
  videoAspectRatioValidator,
} from "./domain";

export default defineSchema({
  brands: defineTable({
    userId: v.string(), // Clerk user id (identity.subject)
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    description: v.string(),
    logoUrl: v.optional(v.string()),
    designTokens: v.optional(designTokensValidator),
    archived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "archived"]),

  brand_preferences: defineTable({
    brandId: v.id("brands"),
    platform: platformValidator,
    enabled: v.boolean(),
    tone: toneValidator,
    defaultRiskLevel: v.number(),
    maxLength: v.number(),
    useEmojis: v.boolean(),
    useHashtags: v.boolean(),
    customInstructions: v.optional(v.string()),
    bannedPhrases: v.array(v.string()),
    bannedTopics: v.array(v.string()),
  })
    .index("by_brand", ["brandId"])
    .index("by_brand_platform", ["brandId", "platform"]),

  competitor_posts: defineTable({
    brandId: v.id("brands"),
    platform: platformValidator,
    originalPostUrl: v.string(),
    originalContent: v.string(),
    authorHandle: v.string(),
    metrics: v.object({
      likes: v.number(),
      reposts: v.number(),
      replies: v.number(),
    }),
    topReplies: v.array(v.string()),
    status: competitorPostStatusValidator,
    error: v.optional(v.string()),
    detectedAt: v.number(),
  })
    .index("by_brand_status", ["brandId", "status"])
    .index("by_url", ["brandId", "originalPostUrl"]),

  aura_steals: defineTable({
    brandId: v.id("brands"),
    competitorPostId: v.id("competitor_posts"),
    targetPlatform: platformValidator,
    riskLevel: v.number(),
    userContext: v.optional(v.string()),
    auraOpportunityScore: v.number(),
    targetWeakness: v.string(),
    generatedResponse: v.string(),
    editedResponse: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_post", ["competitorPostId"])
    .index("by_brand", ["brandId"]),

  publication_assets: defineTable({
    stealId: v.id("aura_steals"),
    brandId: v.id("brands"),
    visualPrompt: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    videoDurationSeconds: v.optional(v.number()),
    videoAspectRatio: v.optional(videoAspectRatioValidator),
    status: assetStatusValidator,
    generation: v.number(),
    createdAt: v.number(),
  }).index("by_steal", ["stealId"]),

  publications: defineTable({
    brandId: v.id("brands"),
    stealId: v.id("aura_steals"),
    platform: platformValidator,
    mode: publicationModeValidator,
    finalText: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    videoDurationSeconds: v.optional(v.number()),
    videoAspectRatio: v.optional(videoAspectRatioValidator),
    status: publicationStatusValidator,
    retryCount: v.number(),
    lastError: v.optional(v.string()),
    externalPostId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_brand", ["brandId"]),

  social_accounts: defineTable({
    brandId: v.id("brands"),
    platform: platformValidator,
    externalAccountId: v.string(),
    handle: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    status: socialAccountStatusValidator,
  })
    .index("by_brand", ["brandId"])
    .index("by_brand_platform", ["brandId", "platform"]),

  aura_ledger: defineTable({
    brandId: v.id("brands"),
    stealId: v.id("aura_steals"),
    auraDelta: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  }).index("by_brand", ["brandId"]),
});
