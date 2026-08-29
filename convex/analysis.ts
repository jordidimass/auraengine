import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireBrandOwner, requireUserId } from "./authz";
import {
  assertHttpUrl,
  assertNonEmpty,
  competitorPostStatusValidator,
  normalizeOptionalText,
  platformValidator,
  type Platform,
} from "./domain";
import { runLlmAnalysis } from "./lib/llm";
import { assertCompetitorPostUrl, normalizeCompetitorUrl, scrapeCompetitorPost } from "./lib/scrape";
import { detectPlatformFromUrl, requireIntegerRisk } from "./lib/risk";
import { requireSteal } from "./stealAccess";

const metricsValidator = v.object({
  likes: v.number(),
  reposts: v.number(),
  replies: v.number(),
});

function publicErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.length > 0
    ) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Analysis pipeline failed";
}

export const verifyBrandOwner = internalQuery({
  args: {
    brandId: v.id("brands"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.brandId);
    if (brand === null || brand.userId !== args.userId) {
      throw new ConvexError({
        code: "BRAND_NOT_FOUND",
        message: "Brand not found",
      });
    }
    return brand;
  },
});

export const verifyStealOwner = internalQuery({
  args: {
    stealId: v.id("aura_steals"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      throw new ConvexError({
        code: "STEAL_NOT_FOUND",
        message: "Steal not found",
      });
    }
    const brand = await ctx.db.get(steal.brandId);
    if (brand === null || brand.userId !== args.userId) {
      throw new ConvexError({
        code: "BRAND_NOT_FOUND",
        message: "Brand not found",
      });
    }
    return { steal, brand };
  },
});

export const getPostInternal = internalQuery({
  args: { postId: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

export const getDefaultRiskForPlatform = internalQuery({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    const preference = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.platform),
      )
      .unique();
    return preference?.defaultRiskLevel ?? 50;
  },
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

export const getStealById = query({
  args: { stealId: v.string() },
  handler: async (ctx, args) => {
    const stealId = ctx.db.normalizeId("aura_steals", args.stealId);
    if (stealId === null) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }

    const steal = await ctx.db.get(stealId);
    if (steal === null) {
      return null;
    }

    const [post, brand] = await Promise.all([
      ctx.db.get(steal.competitorPostId),
      ctx.db.get(steal.brandId),
    ]);

    if (
      post === null ||
      brand === null ||
      brand.userId !== identity.subject ||
      brand.archived
    ) {
      return null;
    }

    return { steal, post, brand };
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
    return await upsertCompetitorPost(ctx, {
      ...args,
      status: "analyzing",
    });
  },
});

export const savePostInternal = internalMutation({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
    url: v.string(),
    content: v.string(),
    authorHandle: v.string(),
    metrics: metricsValidator,
    topReplies: v.optional(v.array(v.string())),
    status: v.optional(competitorPostStatusValidator),
  },
  handler: async (ctx, args) => {
    return await upsertCompetitorPost(ctx, {
      brandId: args.brandId,
      platform: args.platform,
      url: args.url,
      content: args.content,
      authorHandle: args.authorHandle,
      metrics: args.metrics,
      topReplies: args.topReplies ?? [],
      status: args.status ?? "analyzing",
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

export const updateEditedResponse = mutation({
  args: {
    stealId: v.id("aura_steals"),
    editedResponse: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSteal(ctx, args.stealId);
    assertNonEmpty(args.editedResponse, "editedResponse");
    await ctx.db.patch(args.stealId, {
      editedResponse: args.editedResponse.trim(),
    });
    return null;
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
    return await loadAnalysisContextDocs(ctx, args);
  },
});

export const beginScrape = internalMutation({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
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
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      throw new ConvexError({
        code: "STEAL_NOT_FOUND",
        message: "Steal not found",
      });
    }
    return steal;
  },
});

export const scrapePostFromUrl = internalAction({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"competitor_posts">> => {
    const url = normalizeCompetitorUrl(args.url.trim());
    const platform = detectPlatformFromUrl(url);
    assertCompetitorPostUrl(url);
    const postId = await ctx.runMutation(internal.analysis.beginScrape, {
      brandId: args.brandId,
      url,
      platform,
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
      return postId;
    } catch (error) {
      await ctx.runMutation(internal.analysis.markPost, {
        postId,
        status: "failed",
        error: publicErrorMessage(error),
      });
      throw error;
    }
  },
});

export const scrapeAndAnalyzeFromUrl = internalAction({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    riskLevel: v.number(),
    targetPlatform: platformValidator,
    userContext: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ postId: Id<"competitor_posts">; stealId: Id<"aura_steals"> }> => {
    const postId = await ctx.runAction(internal.analysis.scrapePostFromUrl, {
      brandId: args.brandId,
      url: args.url,
    });
    const stealId = await ctx.runAction(internal.analysis.analyzePostPipeline, {
      postId,
      riskLevel: args.riskLevel,
      targetPlatform: args.targetPlatform,
      userContext: args.userContext,
    });
    return { postId, stealId };
  },
});

export const analyzePostPipeline = internalAction({
  args: {
    postId: v.id("competitor_posts"),
    riskLevel: v.number(),
    targetPlatform: platformValidator,
    userContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"aura_steals">> => {
    const riskLevel = requireIntegerRisk(args.riskLevel);

    try {
      const post = await ctx.runQuery(internal.analysis.getPostInternal, {
        postId: args.postId,
      });
      if (post === null) {
        throw new ConvexError({
          code: "POST_NOT_FOUND",
          message: "Competitor post not found",
        });
      }

      await ctx.runMutation(internal.analysis.markPost, {
        postId: args.postId,
        status: "analyzing",
      });

      const packed = await ctx.runQuery(internal.analysis.loadAnalysisContext, {
        brandId: post.brandId,
        postId: args.postId,
        targetPlatform: args.targetPlatform,
      });
      if (packed.post === null || packed.preferences === null) {
        throw new ConvexError({
          code: "ANALYSIS_CONTEXT_MISSING",
          message: "Analysis context is incomplete",
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
        postId: args.postId,
        riskLevel,
        userContext: args.userContext,
        score: analysis.auraScore,
        weakness: analysis.weakness,
        response: analysis.response,
        targetPlatform: args.targetPlatform,
        visualPrompt: analysis.visualPrompt,
      });
      return stealId;
    } catch (error) {
      await ctx.runMutation(internal.analysis.markPost, {
        postId: args.postId,
        status: "failed",
        error: publicErrorMessage(error),
      });
      throw error;
    }
  },
});

export const continueAnalyzeFromPost = internalAction({
  args: {
    postId: v.id("competitor_posts"),
    url: v.string(),
    riskLevel: v.number(),
    targetPlatform: platformValidator,
    userContext: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const scraped = await scrapeCompetitorPost(args.url);
      await ctx.runMutation(internal.analysis.markPost, {
        postId: args.postId,
        status: "analyzing",
        originalContent: scraped.originalContent,
        authorHandle: scraped.authorHandle,
        metrics: scraped.metrics,
        topReplies: scraped.topReplies,
        platform: scraped.platform,
      });
      await ctx.runAction(internal.analysis.analyzePostPipeline, {
        postId: args.postId,
        riskLevel: args.riskLevel,
        targetPlatform: args.targetPlatform,
        userContext: args.userContext,
      });
    } catch (error) {
      await ctx.runMutation(internal.analysis.markPost, {
        postId: args.postId,
        status: "failed",
        error: publicErrorMessage(error),
      });
    }
    return null;
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
  returns: v.object({
    postId: v.id("competitor_posts"),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ctx.runQuery(internal.analysis.verifyBrandOwner, {
      brandId: args.brandId,
      userId,
    });

    let url: string;
    try {
      url = normalizeCompetitorUrl(args.url.trim());
    } catch {
      throw new ConvexError({
        code: "INVALID_POST_URL",
        message: "That is not a valid URL.",
      });
    }
    const platform = detectPlatformFromUrl(url);
    assertCompetitorPostUrl(url);
    const postId = await ctx.runMutation(internal.analysis.beginScrape, {
      brandId: args.brandId,
      url,
      platform,
    });

    await ctx.scheduler.runAfter(0, internal.analysis.continueAnalyzeFromPost, {
      postId,
      url,
      riskLevel: requireIntegerRisk(args.riskLevel),
      targetPlatform: args.targetPlatform,
      userContext: args.userContext,
    });

    return { postId };
  },
});

export const regenerateCopy = action({
  args: {
    stealId: v.id("aura_steals"),
    riskLevel: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"aura_steals">> => {
    const userId = await requireUserId(ctx);
    await ctx.runQuery(internal.analysis.verifyStealOwner, {
      stealId: args.stealId,
      userId,
    });

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
    if (packed.post === null || packed.preferences === null) {
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

async function loadAnalysisContextDocs(
  ctx: Pick<QueryCtx, "db">,
  args: {
    brandId: Id<"brands">;
    postId?: Id<"competitor_posts">;
    stealId?: Id<"aura_steals">;
    targetPlatform: Platform;
  },
) {
  const brand = await ctx.db.get(args.brandId);
  if (brand === null) {
    throw new ConvexError({
      code: "BRAND_NOT_FOUND",
      message: "Brand not found",
    });
  }

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
}

async function upsertCompetitorPost(
  ctx: MutationCtx,
  args: {
    brandId: Id<"brands">;
    platform: Platform;
    url: string;
    content: string;
    authorHandle: string;
    metrics: { likes: number; reposts: number; replies: number };
    topReplies: string[];
    status: "scraping" | "analyzing" | "ready" | "failed";
  },
) {
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
    status: args.status,
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
}

async function insertSteal(
  ctx: MutationCtx,
  args: {
    postId: Id<"competitor_posts">;
    brandId: Id<"brands">;
    platform: Platform;
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
