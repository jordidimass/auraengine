import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import {
  assertHttpUrl,
  competitorPostStatusValidator,
  normalizeOptionalText,
  platformValidator,
} from "./domain";
import { runLlmAnalysis } from "./lib/llm";
import { scrapeCompetitorPost, assertCompetitorPostUrl } from "./lib/scrape";
import { detectPlatformFromUrl, requireIntegerRisk } from "./lib/risk";
import { requireSteal } from "./stealAccess";

const metricsValidator = v.object({
  likes: v.number(),
  reposts: v.number(),
  replies: v.number(),
});

export const getPost = query({
  args: { postId: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (post === null) return null;
    await requireBrandOwner(ctx, post.brandId);
    const steal = await ctx.db
      .query("aura_steals")
      .withIndex("by_post", (q) => q.eq("competitorPostId", args.postId))
      .order("desc")
      .first();
    return { post, steal };
  },
});

export const savePost = mutation({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
    url: v.string(),
    content: v.string(),
    authorHandle: v.string(),
    metrics: metricsValidator,
    topReplies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    assertHttpUrl(args.url, "url");
    const originalPostUrl = args.url.trim();
    const existing = await ctx.db
      .query("competitor_posts")
      .withIndex("by_url", (q) =>
        q.eq("brandId", args.brandId).eq("originalPostUrl", originalPostUrl),
      )
      .unique();

    const fields = {
      platform: args.platform,
      originalContent: args.content,
      authorHandle: args.authorHandle.replace(/^@/, ""),
      metrics: args.metrics,
      topReplies: args.topReplies,
      status: "analyzing" as const,
      error: undefined,
    };

    if (existing !== null) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("competitor_posts", {
      brandId: args.brandId,
      originalPostUrl,
      detectedAt: Date.now(),
      ...fields,
    });
  },
});

export const saveSteal = mutation({
  args: {
    postId: v.id("competitor_posts"),
    riskLevel: v.number(),
    userContext: v.optional(v.string()),
    score: v.number(),
    weakness: v.string(),
    response: v.string(),
    targetPlatform: v.optional(platformValidator),
    visualPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (post === null) {
      throw new ConvexError({
        code: "POST_NOT_FOUND",
        message: "Post not found",
      });
    }
    await requireBrandOwner(ctx, post.brandId);
    return await insertSteal(ctx, {
      postId: args.postId,
      brandId: post.brandId,
      platform: args.targetPlatform ?? post.platform,
      riskLevel: args.riskLevel,
      userContext: args.userContext,
      score: args.score,
      weakness: args.weakness,
      response: args.response,
      visualPrompt: args.visualPrompt,
    });
  },
});

export const loadAnalysisContext = internalQuery({
  args: {
    brandId: v.id("brands"),
    postId: v.optional(v.id("competitor_posts")),
    stealId: v.optional(v.id("aura_steals")),
    targetPlatform: platformValidator,
  },
  handler: async (ctx, args) => {
    const brand = await requireBrandOwner(ctx, args.brandId);
    const preferences = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.targetPlatform),
      )
      .unique();
    if (preferences === null || !preferences.enabled) {
      throw new ConvexError({
        code: "PLATFORM_DISABLED",
        message: "This platform is disabled for the brand",
      });
    }
    const post = args.postId ? await ctx.db.get(args.postId) : null;
    const steal = args.stealId ? await ctx.db.get(args.stealId) : null;
    return { brand, preferences, post, steal };
  },
});

export const beginScrape = internalMutation({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const originalPostUrl = args.url.trim();
    const existing = await ctx.db
      .query("competitor_posts")
      .withIndex("by_url", (q) =>
        q.eq("brandId", args.brandId).eq("originalPostUrl", originalPostUrl),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        status: "scraping",
        error: undefined,
        platform: args.platform,
      });
      return existing._id;
    }
    return await ctx.db.insert("competitor_posts", {
      brandId: args.brandId,
      platform: args.platform,
      originalPostUrl,
      originalContent: "",
      authorHandle: "",
      metrics: { likes: 0, reposts: 0, replies: 0 },
      topReplies: [],
      status: "scraping",
      detectedAt: Date.now(),
    });
  },
});

export const markPost = internalMutation({
  args: {
    postId: v.id("competitor_posts"),
    status: competitorPostStatusValidator,
    error: v.optional(v.string()),
    originalContent: v.optional(v.string()),
    authorHandle: v.optional(v.string()),
    metrics: v.optional(metricsValidator),
    topReplies: v.optional(v.array(v.string())),
    platform: v.optional(platformValidator),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (post === null) {
      throw new ConvexError({
        code: "POST_NOT_FOUND",
        message: "Post not found",
      });
    }
    await requireBrandOwner(ctx, post.brandId);
    const { postId, ...patch } = args;
    await ctx.db.patch(postId, patch);
  },
});

export const patchStealCopy = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    riskLevel: v.number(),
    score: v.number(),
    weakness: v.string(),
    response: v.string(),
    visualPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSteal(ctx, args.stealId);
    await ctx.db.patch(args.stealId, {
      riskLevel: requireIntegerRisk(args.riskLevel),
      auraOpportunityScore: requireIntegerRisk(args.score, "score"),
      targetWeakness: args.weakness,
      generatedResponse: args.response,
      editedResponse: undefined,
    });
    const prompt = normalizeOptionalText(args.visualPrompt);
    if (prompt !== undefined) {
      const latest = await ctx.db
        .query("publication_assets")
        .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
        .order("desc")
        .first();
      if (latest !== null) {
        await ctx.db.patch(latest._id, { visualPrompt: prompt });
      }
    }
  },
});

export const saveStealInternal = internalMutation({
  args: {
    postId: v.id("competitor_posts"),
    riskLevel: v.number(),
    userContext: v.optional(v.string()),
    score: v.number(),
    weakness: v.string(),
    response: v.string(),
    targetPlatform: platformValidator,
    visualPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (post === null) {
      throw new ConvexError({
        code: "POST_NOT_FOUND",
        message: "Post not found",
      });
    }
    await requireBrandOwner(ctx, post.brandId);
    return await insertSteal(ctx, {
      postId: args.postId,
      brandId: post.brandId,
      platform: args.targetPlatform,
      riskLevel: args.riskLevel,
      userContext: args.userContext,
      score: args.score,
      weakness: args.weakness,
      response: args.response,
      visualPrompt: args.visualPrompt,
    });
  },
});

export const getStealInternal = internalQuery({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    const { steal } = await requireSteal(ctx, args.stealId);
    return steal;
  },
});

export const analyzeUrl = action({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    riskLevel: v.number(),
    userContext: v.optional(v.string()),
    targetPlatform: platformValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ postId: Id<"competitor_posts">; stealId: Id<"aura_steals"> }> => {
    const url = args.url.trim();
    const riskLevel = requireIntegerRisk(args.riskLevel);
    const sourcePlatform = detectPlatformFromUrl(url);
    assertCompetitorPostUrl(url);
    const postId = await ctx.runMutation(internal.analysis.beginScrape, {
      brandId: args.brandId,
      url,
      platform: sourcePlatform,
    });

    try {
      const scraped = await scrapeCompetitorPost(url);
      await ctx.runMutation(internal.analysis.markPost, {
        postId,
        status: "analyzing",
        originalContent: scraped.originalContent,
        authorHandle: scraped.authorHandle,
        metrics: scraped.metrics,
        topReplies: scraped.topReplies,
        platform: scraped.platform,
      });

      const packed = await ctx.runQuery(internal.analysis.loadAnalysisContext, {
        brandId: args.brandId,
        postId,
        targetPlatform: args.targetPlatform,
      });
      if (packed.post === null) {
        throw new ConvexError({
          code: "POST_NOT_FOUND",
          message: "Post disappeared during analysis",
        });
      }

      const analysis = await runLlmAnalysis({
        brandName: packed.brand.name,
        industry: packed.brand.industry,
        description: packed.brand.description,
        tone: packed.preferences.tone,
        bannedPhrases: packed.preferences.bannedPhrases,
        bannedTopics: packed.preferences.bannedTopics,
        customInstructions: packed.preferences.customInstructions,
        riskLevel,
        platform: args.targetPlatform,
        originalContent: packed.post.originalContent,
        authorHandle: packed.post.authorHandle,
        metrics: packed.post.metrics,
        topReplies: packed.post.topReplies,
        userContext: args.userContext,
        maxLength: packed.preferences.maxLength,
        useEmojis: packed.preferences.useEmojis,
        useHashtags: packed.preferences.useHashtags,
      });

      const stealId = await ctx.runMutation(internal.analysis.saveStealInternal, {
        postId,
        riskLevel,
        userContext: args.userContext,
        score: analysis.auraScore,
        weakness: analysis.weakness,
        response: analysis.response,
        targetPlatform: args.targetPlatform,
        visualPrompt: analysis.visualPrompt,
      });

      return { postId, stealId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analysis failed";
      await ctx.runMutation(internal.analysis.markPost, {
        postId,
        status: "failed",
        error: message,
      });
      throw error;
    }
  },
});

export const regenerateCopy = action({
  args: {
    stealId: v.id("aura_steals"),
    riskLevel: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"aura_steals">> => {
    const riskLevel = requireIntegerRisk(args.riskLevel);
    const steal = await ctx.runQuery(internal.analysis.getStealInternal, {
      stealId: args.stealId,
    });
    const packed = await ctx.runQuery(internal.analysis.loadAnalysisContext, {
      brandId: steal.brandId,
      postId: steal.competitorPostId,
      stealId: args.stealId,
      targetPlatform: steal.targetPlatform,
    });
    if (packed.post === null) {
      throw new ConvexError({
        code: "POST_NOT_FOUND",
        message: "Competitor post is missing",
      });
    }

    const analysis = await runLlmAnalysis({
      brandName: packed.brand.name,
      industry: packed.brand.industry,
      description: packed.brand.description,
      tone: packed.preferences.tone,
      bannedPhrases: packed.preferences.bannedPhrases,
      bannedTopics: packed.preferences.bannedTopics,
      customInstructions: packed.preferences.customInstructions,
      riskLevel,
      platform: steal.targetPlatform,
      originalContent: packed.post.originalContent,
      authorHandle: packed.post.authorHandle,
      metrics: packed.post.metrics,
      topReplies: packed.post.topReplies,
      userContext: steal.userContext,
      maxLength: packed.preferences.maxLength,
      useEmojis: packed.preferences.useEmojis,
      useHashtags: packed.preferences.useHashtags,
    });

    await ctx.runMutation(internal.analysis.patchStealCopy, {
      stealId: args.stealId,
      riskLevel,
      score: analysis.auraScore,
      weakness: analysis.weakness,
      response: analysis.response,
      visualPrompt: analysis.visualPrompt,
    });
    return args.stealId;
  },
});

async function insertSteal(
  ctx: MutationCtx,
  args: {
    postId: Id<"competitor_posts">;
    brandId: Id<"brands">;
    platform: "x" | "linkedin";
    riskLevel: number;
    userContext?: string;
    score: number;
    weakness: string;
    response: string;
    visualPrompt?: string;
  },
) {
  const stealId = await ctx.db.insert("aura_steals", {
    brandId: args.brandId,
    competitorPostId: args.postId,
    targetPlatform: args.platform,
    riskLevel: requireIntegerRisk(args.riskLevel),
    userContext: normalizeOptionalText(args.userContext),
    auraOpportunityScore: requireIntegerRisk(args.score, "score"),
    targetWeakness: args.weakness,
    generatedResponse: args.response,
    createdAt: Date.now(),
  });
  const prompt = normalizeOptionalText(args.visualPrompt);
  if (prompt !== undefined) {
    await ctx.db.insert("publication_assets", {
      stealId,
      brandId: args.brandId,
      visualPrompt: prompt,
      status: "ready",
      generation: 1,
      createdAt: Date.now(),
    });
  }
  await ctx.db.patch(args.postId, { status: "ready", error: undefined });
  return stealId;
}
