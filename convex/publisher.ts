import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { platformValidator } from "./domain";
import { requireSteal } from "./stealAccess";

const MAX_RETRIES = 3;

export function projectedAuraGain(auraOpportunityScore: number): number {
  return Math.round(auraOpportunityScore * 100);
}

export const history = query({
  args: {
    brandId: v.id("brands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    return await ctx.db
      .query("publications")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const brandAura = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const entries = await ctx.db
      .query("aura_ledger")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();
    return entries.reduce((sum, entry) => sum + entry.auraDelta, 0);
  },
});

export const getPublication = query({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (publication === null) {
      return null;
    }
    await requireBrandOwner(ctx, publication.brandId);
    return publication;
  },
});

export const enqueue = mutation({
  args: {
    stealId: v.id("aura_steals"),
    platform: platformValidator,
    finalText: v.string(),
  },
  handler: async (ctx, args) => {
    const { steal, brand } = await requireSteal(ctx, args.stealId);
    const finalText = args.finalText.trim();
    if (finalText.length === 0) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "finalText cannot be empty",
      });
    }

    const account = await ctx.db
      .query("social_accounts")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", brand._id).eq("platform", args.platform),
      )
      .unique();
    const mode = account?.status === "active" ? "live" : "draft";
    const auraDelta = projectedAuraGain(steal.auraOpportunityScore);

    const latestAsset = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    const publicationId = await ctx.db.insert("publications", {
      brandId: brand._id,
      stealId: args.stealId,
      platform: args.platform,
      mode,
      finalText,
      imageStorageId: latestAsset?.imageStorageId,
      status: "pending",
      retryCount: 0,
    });

    await ctx.db.insert("aura_ledger", {
      brandId: brand._id,
      stealId: args.stealId,
      auraDelta,
      reason: mode === "live" ? "queued live publish" : "draft aura credit",
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.stealId, { editedResponse: finalText });

    await ctx.scheduler.runAfter(0, api.publisher.execute, {
      publicationId,
    });

    return { publicationId, mode, auraDelta };
  },
});

export const markPublishing = internalMutation({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (publication === null) {
      throw new ConvexError({
        code: "PUBLICATION_NOT_FOUND",
        message: "Publication not found",
      });
    }
    await ctx.db.patch(args.publicationId, {
      status: "publishing",
      lastError: undefined,
    });
    return publication;
  },
});

export const markPublished = internalMutation({
  args: {
    publicationId: v.id("publications"),
    externalPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (publication === null) {
      throw new ConvexError({
        code: "PUBLICATION_NOT_FOUND",
        message: "Publication not found",
      });
    }
    await ctx.db.patch(args.publicationId, {
      status: "sent",
      externalPostId: args.externalPostId,
      publishedAt: Date.now(),
      lastError: undefined,
    });
  },
});

export const markFailedAttempt = internalMutation({
  args: {
    publicationId: v.id("publications"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (publication === null) {
      throw new ConvexError({
        code: "PUBLICATION_NOT_FOUND",
        message: "Publication not found",
      });
    }
    const retryCount = publication.retryCount + 1;
    const status = retryCount >= MAX_RETRIES ? "failed" : "pending";
    await ctx.db.patch(args.publicationId, {
      retryCount,
      lastError: args.error,
      status,
    });
    return { retryCount, status, platform: publication.platform };
  },
});

export const loadPublicationAccount = internalQuery({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (publication === null) {
      throw new ConvexError({
        code: "PUBLICATION_NOT_FOUND",
        message: "Publication not found",
      });
    }
    const account = await ctx.db
      .query("social_accounts")
      .withIndex("by_brand_platform", (q) =>
        q
          .eq("brandId", publication.brandId)
          .eq("platform", publication.platform),
      )
      .unique();
    return {
      publication,
      accessToken: account?.status === "active" ? account.accessToken : null,
    };
  },
});

async function publishLive(args: {
  platform: "x" | "linkedin";
  text: string;
  accessToken: string;
}): Promise<string> {
  if (args.platform === "x") {
    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: args.text }),
    });
    if (!response.ok) {
      throw new ConvexError({
        code: "X_PUBLISH_FAILED",
        message: `X publish failed (${response.status})`,
      });
    }
    const body = (await response.json()) as { data?: { id?: string } };
    return body.data?.id ?? "x";
  }

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: args.text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!response.ok) {
    throw new ConvexError({
      code: "LINKEDIN_PUBLISH_FAILED",
      message: `LinkedIn publish failed (${response.status})`,
    });
  }
  return response.headers.get("x-restli-id") ?? "linkedin";
}

export const execute = action({
  args: { publicationId: v.id("publications") },
  handler: async (
    ctx,
    args,
  ): Promise<{ status: "sent" | "failed" | "retrying" }> => {
    const packed = await ctx.runQuery(
      internal.publisher.loadPublicationAccount,
      { publicationId: args.publicationId },
    );
    const { publication } = packed;

    if (publication.mode === "draft") {
      await ctx.runMutation(internal.publisher.markPublished, {
        publicationId: args.publicationId,
        externalPostId: "draft",
      });
      return { status: "sent" };
    }

    await ctx.runMutation(internal.publisher.markPublishing, {
      publicationId: args.publicationId,
    });

    try {
      if (!packed.accessToken) {
        throw new ConvexError({
          code: "SOCIAL_ACCOUNT_MISSING",
          message: "Social account is missing or expired",
        });
      }
      const externalPostId = await publishLive({
        platform: publication.platform,
        text: publication.finalText,
        accessToken: packed.accessToken,
      });
      await ctx.runMutation(internal.publisher.markPublished, {
        publicationId: args.publicationId,
        externalPostId,
      });
      return { status: "sent" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      const result = await ctx.runMutation(
        internal.publisher.markFailedAttempt,
        {
          publicationId: args.publicationId,
          error: message,
        },
      );
      if (result.status === "pending") {
        const delayMs = 2 ** result.retryCount * 1000;
        await ctx.scheduler.runAfter(delayMs, api.publisher.execute, {
          publicationId: args.publicationId,
        });
        return { status: "retrying" };
      }
      return { status: "failed" };
    }
  },
});
