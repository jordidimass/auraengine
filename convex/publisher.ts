import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { assertNonEmpty, platformValidator } from "./domain";

export function projectedAuraGain(auraOpportunityScore: number): number {
  return Math.round(auraOpportunityScore * 100);
}

export const enqueue = mutation({
  args: {
    stealId: v.id("aura_steals"),
    platform: platformValidator,
    finalText: v.string(),
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
    assertNonEmpty(args.finalText, "finalText");

    const trimmedText = args.finalText.trim();
    const auraDelta = projectedAuraGain(steal.auraOpportunityScore);

    const asset = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    const hasActiveSocialAccount = await ctx.db
      .query("social_accounts")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", steal.brandId).eq("platform", args.platform),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const publicationId = await ctx.db.insert("publications", {
      brandId: steal.brandId,
      stealId: args.stealId,
      platform: args.platform,
      mode: hasActiveSocialAccount ? "live" : "draft",
      finalText: trimmedText,
      imageStorageId: asset?.imageStorageId,
      status: hasActiveSocialAccount ? "publishing" : "sent",
      retryCount: 0,
      publishedAt: Date.now(),
    });

    await ctx.db.patch(args.stealId, {
      editedResponse: trimmedText,
    });

    await ctx.db.insert("aura_ledger", {
      brandId: steal.brandId,
      stealId: args.stealId,
      auraDelta,
      reason: `Aura robada en ${args.platform}`,
      createdAt: Date.now(),
    });

    return { publicationId, auraDelta, mode: hasActiveSocialAccount ? "live" as const : "draft" as const };
  },
});

export const history = query({
  args: {
    brandId: v.id("brands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("publications")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(limit);
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
