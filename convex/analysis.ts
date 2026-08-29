import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import {
  assertHttpUrl,
  assertNonEmpty,
  assertRiskLevel,
  competitorPostStatusValidator,
  platformValidator,
  type Platform,
} from "./domain";

const metricsValidator = v.object({
  likes: v.number(),
  reposts: v.number(),
  replies: v.number(),
});

type AnalysisResult = {
  weakness: string;
  auraScore: number;
  response: string;
  visualPrompt: string;
};

export const assertBrandAccess = internalQuery({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
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

export const findPostByUrl = internalQuery({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("competitor_posts")
      .withIndex("by_url", (q) =>
        q.eq("brandId", args.brandId).eq("originalPostUrl", args.url.trim()),
      )
      .unique();
  },
});

export const getPostDocument = internalQuery({
  args: { postId: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

export const getBrandDocument = internalQuery({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});

export const getPreferenceForPlatform = internalQuery({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.platform),
      )
      .unique();
  },
});

export const savePost = internalMutation({
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
    assertHttpUrl(args.url, "url");
    assertNonEmpty(args.content, "content");
    assertNonEmpty(args.authorHandle, "authorHandle");

    const existing = await ctx.db
      .query("competitor_posts")
      .withIndex("by_url", (q) =>
        q.eq("brandId", args.brandId).eq("originalPostUrl", args.url.trim()),
      )
      .unique();

    if (existing !== null) {
      return existing._id;
    }

    return await ctx.db.insert("competitor_posts", {
      brandId: args.brandId,
      platform: args.platform,
      originalPostUrl: args.url.trim(),
      originalContent: args.content.trim(),
      authorHandle: args.authorHandle.trim(),
      metrics: args.metrics,
      topReplies: args.topReplies ?? [],
      status: args.status ?? "analyzing",
      detectedAt: Date.now(),
    });
  },
});

export const updatePostContent = internalMutation({
  args: {
    postId: v.id("competitor_posts"),
    content: v.string(),
    authorHandle: v.string(),
    metrics: metricsValidator,
    topReplies: v.array(v.string()),
    status: competitorPostStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      originalContent: args.content.trim(),
      authorHandle: args.authorHandle.trim(),
      metrics: args.metrics,
      topReplies: args.topReplies,
      status: args.status,
    });
  },
});

export const setPostStatus = internalMutation({
  args: {
    postId: v.id("competitor_posts"),
    status: competitorPostStatusValidator,
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: args.status,
      error: args.error,
    });
  },
});

export const saveSteal = internalMutation({
  args: {
    brandId: v.id("brands"),
    postId: v.id("competitor_posts"),
    targetPlatform: platformValidator,
    riskLevel: v.number(),
    userContext: v.optional(v.string()),
    score: v.number(),
    weakness: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    assertRiskLevel(args.riskLevel);

    const existing = await ctx.db
      .query("aura_steals")
      .withIndex("by_post", (q) => q.eq("competitorPostId", args.postId))
      .order("desc")
      .first();

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        targetPlatform: args.targetPlatform,
        riskLevel: args.riskLevel,
        userContext: args.userContext,
        auraOpportunityScore: args.score,
        targetWeakness: args.weakness,
        generatedResponse: args.response,
      });
      return existing._id;
    }

    return await ctx.db.insert("aura_steals", {
      brandId: args.brandId,
      competitorPostId: args.postId,
      targetPlatform: args.targetPlatform,
      riskLevel: args.riskLevel,
      userContext: args.userContext,
      auraOpportunityScore: args.score,
      targetWeakness: args.weakness,
      generatedResponse: args.response,
      createdAt: Date.now(),
    });
  },
});

export const getStealDocument = internalQuery({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stealId);
  },
});

export const assertStealAccess = internalQuery({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      throw new ConvexError({
        code: "STEAL_NOT_FOUND",
        message: "Aura steal not found",
      });
    }
    await requireBrandOwner(ctx, steal.brandId);
    return steal;
  },
});

export const updateStealCopy = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    riskLevel: v.number(),
    score: v.number(),
    weakness: v.string(),
    response: v.string(),
    editedResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertRiskLevel(args.riskLevel);
    await ctx.db.patch(args.stealId, {
      riskLevel: args.riskLevel,
      auraOpportunityScore: args.score,
      targetWeakness: args.weakness,
      generatedResponse: args.response,
      editedResponse: args.editedResponse,
    });
  },
});

export const getPost = query({
  args: { postId: v.id("competitor_posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (post === null) {
      return null;
    }

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
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      return null;
    }

    await requireBrandOwner(ctx, steal.brandId);

    const [post, brand] = await Promise.all([
      ctx.db.get(steal.competitorPostId),
      ctx.db.get(steal.brandId),
    ]);

    if (post === null || brand === null) {
      return null;
    }

    return { steal, post, brand };
  },
});

export const updateEditedResponse = mutation({
  args: {
    stealId: v.id("aura_steals"),
    editedResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      throw new ConvexError({
        code: "STEAL_NOT_FOUND",
        message: "Aura steal not found",
      });
    }

    await requireBrandOwner(ctx, steal.brandId);
    assertNonEmpty(args.editedResponse, "editedResponse");

    await ctx.db.patch(args.stealId, {
      editedResponse: args.editedResponse.trim(),
    });
    return null;
  },
});

export const analyzePostPipeline = internalAction({
  args: {
    postId: v.id("competitor_posts"),
    riskLevel: v.number(),
    targetPlatform: platformValidator,
    userContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertRiskLevel(args.riskLevel);

    try {
      await ctx.runMutation(internal.analysis.setPostStatus, {
        postId: args.postId,
        status: "analyzing",
      });

      const post = await ctx.runQuery(internal.analysis.getPostDocument, {
        postId: args.postId,
      });
      if (post === null) {
        throw new ConvexError({
          code: "POST_NOT_FOUND",
          message: "Competitor post not found",
        });
      }

      const brand = await ctx.runQuery(internal.analysis.getBrandDocument, {
        brandId: post.brandId,
      });
      if (brand === null) {
        throw new ConvexError({
          code: "BRAND_NOT_FOUND",
          message: "Brand not found",
        });
      }

      const preference = await ctx.runQuery(
        internal.analysis.getPreferenceForPlatform,
        {
          brandId: post.brandId,
          platform: args.targetPlatform,
        },
      );

      const analysis = buildAnalysisResult({
        post,
        brand,
        preference,
        riskLevel: args.riskLevel,
        userContext: args.userContext,
      });

      await ctx.runMutation(internal.analysis.saveSteal, {
        brandId: post.brandId,
        postId: args.postId,
        targetPlatform: args.targetPlatform,
        riskLevel: args.riskLevel,
        userContext: args.userContext,
        score: analysis.auraScore,
        weakness: analysis.weakness,
        response: analysis.response,
      });

      await ctx.runMutation(internal.analysis.setPostStatus, {
        postId: args.postId,
        status: "ready",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Analysis pipeline failed";
      await ctx.runMutation(internal.analysis.setPostStatus, {
        postId: args.postId,
        status: "failed",
        error: message,
      });
      throw error;
    }
  },
});

export const analyzeUrl = action({
  args: {
    brandId: v.id("brands"),
    url: v.string(),
    riskLevel: v.number(),
    targetPlatform: platformValidator,
    userContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.analysis.assertBrandAccess, {
      brandId: args.brandId,
    });

    assertHttpUrl(args.url, "url");
    assertRiskLevel(args.riskLevel);

    const trimmedUrl = args.url.trim();
    const existing = await ctx.runQuery(internal.analysis.findPostByUrl, {
      brandId: args.brandId,
      url: trimmedUrl,
    });

    let postId: Id<"competitor_posts">;

    if (existing !== null) {
      postId = existing._id;
      await ctx.runMutation(internal.analysis.setPostStatus, {
        postId,
        status: "scraping",
        error: undefined,
      });
    } else {
      postId = await ctx.runMutation(internal.analysis.savePost, {
        brandId: args.brandId,
        platform: args.targetPlatform,
        url: trimmedUrl,
        content: "Recopilando contenido del post…",
        authorHandle: "pending",
        metrics: { likes: 0, reposts: 0, replies: 0 },
        topReplies: [],
        status: "scraping",
      });
    }

    try {
      const scraped = await scrapePost(trimmedUrl, args.targetPlatform);

      await ctx.runMutation(internal.analysis.updatePostContent, {
        postId,
        content: scraped.content,
        authorHandle: scraped.authorHandle,
        metrics: scraped.metrics,
        topReplies: scraped.topReplies,
        status: "analyzing",
      });

      await ctx.runAction(internal.analysis.analyzePostPipeline, {
        postId,
        riskLevel: args.riskLevel,
        targetPlatform: args.targetPlatform,
        userContext: args.userContext,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze URL";
      await ctx.runMutation(internal.analysis.setPostStatus, {
        postId,
        status: "failed",
        error: message,
      });
      throw error;
    }

    return { postId };
  },
});

export const regenerateCopy = action({
  args: {
    stealId: v.id("aura_steals"),
    riskLevel: v.number(),
  },
  handler: async (ctx, args) => {
    assertRiskLevel(args.riskLevel);

    const steal = await ctx.runQuery(internal.analysis.assertStealAccess, {
      stealId: args.stealId,
    });

    const post = await ctx.runQuery(internal.analysis.getPostDocument, {
      postId: steal.competitorPostId,
    });
    if (post === null) {
      throw new ConvexError({
        code: "POST_NOT_FOUND",
        message: "Competitor post not found",
      });
    }

    const brand = await ctx.runQuery(internal.analysis.getBrandDocument, {
      brandId: steal.brandId,
    });
    if (brand === null) {
      throw new ConvexError({
        code: "BRAND_NOT_FOUND",
        message: "Brand not found",
      });
    }

    const preference = await ctx.runQuery(
      internal.analysis.getPreferenceForPlatform,
      {
        brandId: steal.brandId,
        platform: steal.targetPlatform,
      },
    );

    const analysis = buildAnalysisResult({
      post,
      brand,
      preference,
      riskLevel: args.riskLevel,
      userContext: steal.userContext,
    });

    await ctx.runMutation(internal.analysis.updateStealCopy, {
      stealId: args.stealId,
      riskLevel: args.riskLevel,
      score: analysis.auraScore,
      weakness: analysis.weakness,
      response: analysis.response,
      editedResponse: analysis.response,
    });

    return { stealId: args.stealId, auraOpportunityScore: analysis.auraScore };
  },
});

function buildAnalysisResult({
  post,
  brand,
  preference,
  riskLevel,
  userContext,
}: {
  post: Doc<"competitor_posts">;
  brand: Doc<"brands">;
  preference: Doc<"brand_preferences"> | null;
  riskLevel: number;
  userContext?: string;
}): AnalysisResult {
  const engagement =
    post.metrics.likes + post.metrics.reposts * 2 + post.metrics.replies;
  const auraScore = Math.min(
    100,
    Math.max(25, Math.round(engagement / 15 + riskLevel * 0.35)),
  );

  const tone = preference?.tone ?? "casual";
  const riskBand =
    riskLevel <= 25
      ? "diplomático"
      : riskLevel <= 50
        ? "educativo"
        : riskLevel <= 75
          ? "directo"
          : "roast";

  const replySignal =
    post.topReplies.length > 0
      ? ` Las respuestas señalan: "${post.topReplies[0]}".`
      : "";

  const weakness = `El post de @${post.authorHandle} genera tracción (${post.metrics.likes} likes) pero deja espacio para una contranarrativa ${riskBand}.${replySignal}`;

  const contextLine = userContext
    ? ` Contexto del usuario: ${userContext}.`
    : "";

  const response = `[${riskBand.toUpperCase()} · tono ${tone}] ${brand.name} responde a @${post.authorHandle}: ${post.originalContent.slice(0, 120)}… — oportunidad Aura ${auraScore}/100.${contextLine}`;

  const visualPrompt = `Cyberpunk social card for ${brand.name}, ${brand.industry ?? "tech"} brand, ${riskBand} counter-narrative about competitor post on ${post.platform}, fuchsia and black palette`;

  return { weakness, auraScore, response, visualPrompt };
}

async function scrapePost(url: string, platform: Platform) {
  // TODO: wire Apify actor once APIFY_TOKEN is set in the Convex dashboard.
  const handle = extractHandleFromUrl(url, platform);

  return {
    content: `Post detectado en ${platform.toUpperCase()} (${url}). Integración Apify pendiente — usando contenido de placeholder para el flujo de demo.`,
    authorHandle: handle,
    metrics: {
      likes: 128,
      reposts: 34,
      replies: 12,
    },
    topReplies: [
      "Interesting take, but where's the data?",
      "This ignores the edge cases everyone is hitting.",
    ],
  };
}

function extractHandleFromUrl(url: string, platform: Platform): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (platform === "x") {
      return segments[0] ?? "unknown";
    }

    if (platform === "linkedin") {
      return segments.includes("in")
        ? (segments[segments.indexOf("in") + 1] ?? "unknown")
        : (segments[0] ?? "unknown");
    }
  } catch {
    // fall through
  }

  return "unknown";
}
