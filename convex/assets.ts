import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { assetStatusValidator } from "./domain";

const assetKindValidator = v.union(v.literal("image"), v.literal("audio"));

export const getAssetDocument = internalQuery({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();
  },
});

export const createAssetRecord = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    brandId: v.id("brands"),
    visualPrompt: v.string(),
    status: assetStatusValidator,
    generation: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("publication_assets", {
      stealId: args.stealId,
      brandId: args.brandId,
      visualPrompt: args.visualPrompt,
      status: args.status,
      generation: args.generation,
      createdAt: Date.now(),
    });
  },
});

export const updateAssetRecord = internalMutation({
  args: {
    assetId: v.id("publication_assets"),
    status: assetStatusValidator,
    imageStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    generation: v.optional(v.number()),
    visualPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { assetId, ...updates } = args;
    await ctx.db.patch(assetId, updates);
  },
});

export const saveAsset = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    kind: assetKindValidator,
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    if (asset === null) {
      throw new ConvexError({
        code: "ASSET_NOT_FOUND",
        message: "Publication asset record not found",
      });
    }

    if (args.kind === "image") {
      await ctx.db.patch(asset._id, {
        imageStorageId: args.storageId,
        status: "ready",
      });
    } else {
      await ctx.db.patch(asset._id, {
        audioStorageId: args.storageId,
        status: "ready",
      });
    }

    return null;
  },
});

export const getAssets = query({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      return null;
    }

    await requireBrandOwner(ctx, steal.brandId);

    const asset = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    if (asset === null) {
      return {
        asset: null,
        imageUrl: null,
        audioUrl: null,
      };
    }

    const [imageUrl, audioUrl] = await Promise.all([
      asset.imageStorageId
        ? ctx.storage.getUrl(asset.imageStorageId)
        : Promise.resolve(null),
      asset.audioStorageId
        ? ctx.storage.getUrl(asset.audioStorageId)
        : Promise.resolve(null),
    ]);

    return { asset, imageUrl, audioUrl };
  },
});

export const getGenerationContext = internalQuery({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      return null;
    }

    const [post, brand] = await Promise.all([
      ctx.db.get(steal.competitorPostId),
      ctx.db.get(steal.brandId),
    ]);

    if (post === null || brand === null) {
      return null;
    }

    const copy = steal.editedResponse ?? steal.generatedResponse;
    const visualPrompt = `Cyberpunk social card for ${brand.name}, ${brand.industry ?? "tech"} brand. Counter-narrative on ${steal.targetPlatform}: ${copy.slice(0, 180)}. Fuchsia and black palette, high contrast, neon glow.`;

    return {
      brand,
      steal,
      post,
      copy,
      visualPrompt,
    };
  },
});

export const generateImage = action({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args): Promise<{ assetId: Id<"publication_assets">; generation: number }> => {
    const steal = await ctx.runQuery(internal.analysis.assertStealAccess, {
      stealId: args.stealId,
    });

    const post = await ctx.runQuery(internal.analysis.getPostDocument, {
      postId: steal.competitorPostId,
    });
    const brand = await ctx.runQuery(internal.analysis.getBrandDocument, {
      brandId: steal.brandId,
    });

    if (post === null || brand === null) {
      throw new ConvexError({
        code: "GENERATION_CONTEXT_NOT_FOUND",
        message: "Unable to load generation context",
      });
    }

    const copy = steal.editedResponse ?? steal.generatedResponse;
    const visualPrompt = `Cyberpunk social card for ${brand.name}, ${brand.industry ?? "tech"} brand. Counter-narrative on ${steal.targetPlatform}: ${copy.slice(0, 180)}. Fuchsia and black palette, high contrast, neon glow.`;
    const context = { brand, steal, visualPrompt };

    const existingAsset: Doc<"publication_assets"> | null = await ctx.runQuery(
      internal.assets.getAssetDocument,
      {
        stealId: args.stealId,
      },
    );

    const nextGeneration: number = (existingAsset?.generation ?? 0) + 1;
    let assetId: Id<"publication_assets">;

    if (existingAsset === null) {
      assetId = await ctx.runMutation(internal.assets.createAssetRecord, {
        stealId: args.stealId,
        brandId: steal.brandId,
        visualPrompt: context.visualPrompt,
        status: "generating",
        generation: nextGeneration,
      });
    } else {
      assetId = existingAsset._id;
      await ctx.runMutation(internal.assets.updateAssetRecord, {
        assetId,
        status: "generating",
        generation: nextGeneration,
        visualPrompt: context.visualPrompt,
      });
    }

    try {
      const imageBlob = await generatePlaceholderImage(context);
      const storageId = await ctx.storage.store(imageBlob);

      await ctx.runMutation(internal.assets.updateAssetRecord, {
        assetId,
        status: "ready",
        imageStorageId: storageId,
        generation: nextGeneration,
      });

      return { assetId, generation: nextGeneration };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed";
      await ctx.runMutation(internal.assets.updateAssetRecord, {
        assetId,
        status: "failed",
      });
      throw new ConvexError({
        code: "IMAGE_GENERATION_FAILED",
        message,
      });
    }
  },
});

export const generateVoice = action({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.analysis.assertStealAccess, {
      stealId: args.stealId,
    });

    // TODO: wire ElevenLabs once ELEVENLABS_API_KEY is set in the Convex dashboard.
    throw new ConvexError({
      code: "NOT_IMPLEMENTED",
      message: "ElevenLabs voice generation is not wired yet",
    });
  },
});

async function generatePlaceholderImage(context: {
  brand: Doc<"brands">;
  steal: Doc<"aura_steals">;
  visualPrompt: string;
}) {
  // TODO: replace with fal.ai once FAL_KEY is set in the Convex dashboard.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#09090b"/>
      <stop offset="100%" style="stop-color:#3b0764"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#e879f9" stroke-width="2" opacity="0.6"/>
  <text x="80" y="130" fill="#f0abfc" font-family="Arial, sans-serif" font-size="42" font-weight="700">${escapeXml(context.brand.name)}</text>
  <text x="80" y="190" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="24">AuraEngine · Vista 3 Preview</text>
  <text x="80" y="280" fill="#fafafa" font-family="Arial, sans-serif" font-size="28">${escapeXml(context.steal.targetPlatform.toUpperCase())} · Score ${context.steal.auraOpportunityScore}</text>
  <text x="80" y="340" fill="#d4d4d8" font-family="Arial, sans-serif" font-size="22">Generación ${context.steal.riskLevel}/100 riesgo</text>
  <text x="80" y="420" fill="#e879f9" font-family="Arial, sans-serif" font-size="20">fal.ai placeholder — ${escapeXml(context.visualPrompt.slice(0, 80))}…</text>
</svg>`;

  return new Blob([svg], { type: "image/svg+xml" });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
