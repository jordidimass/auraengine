import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { requireSteal } from "./stealAccess";

export const getAssets = query({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    await requireSteal(ctx, args.stealId);
    const assets = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .collect();

    return await Promise.all(
      assets.map(async (asset) => ({
        _id: asset._id,
        stealId: asset.stealId,
        brandId: asset.brandId,
        visualPrompt: asset.visualPrompt,
        status: asset.status,
        generation: asset.generation,
        createdAt: asset.createdAt,
        imageUrl: asset.imageStorageId
          ? await ctx.storage.getUrl(asset.imageStorageId)
          : null,
        audioUrl: asset.audioStorageId
          ? await ctx.storage.getUrl(asset.audioStorageId)
          : null,
      })),
    );
  },
});

export const saveAsset = mutation({
  args: {
    stealId: v.id("aura_steals"),
    kind: v.union(v.literal("image"), v.literal("audio")),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { steal } = await requireSteal(ctx, args.stealId);
    const latest = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();
    if (latest === null) {
      throw new ConvexError({
        code: "ASSET_NOT_FOUND",
        message: "Generate an analysis before attaching assets",
      });
    }
    await ctx.db.patch(latest._id, {
      brandId: steal.brandId,
      status: "ready",
      ...(args.kind === "image"
        ? { imageStorageId: args.storageId }
        : { audioStorageId: args.storageId }),
    });
    return null;
  },
});

export const prepareGeneration = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    kind: v.union(v.literal("image"), v.literal("audio")),
  },
  handler: async (ctx, args) => {
    const { steal } = await requireSteal(ctx, args.stealId);
    const latest = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    const visualPrompt =
      latest?.visualPrompt ||
      `Cyberpunk social post visual for: ${steal.generatedResponse.slice(0, 280)}`;

    if (args.kind === "audio" && latest !== null) {
      await ctx.db.patch(latest._id, { status: "generating" });
      return {
        assetId: latest._id,
        visualPrompt,
        copy: steal.generatedResponse,
      };
    }

    const nextGeneration =
      args.kind === "image" ? (latest?.generation ?? 0) + 1 : (latest?.generation ?? 1);

    const assetId = await ctx.db.insert("publication_assets", {
      stealId: args.stealId,
      brandId: steal.brandId,
      visualPrompt,
      status: "generating",
      generation: Math.max(nextGeneration, 1),
      imageStorageId: latest?.imageStorageId,
      audioStorageId: latest?.audioStorageId,
      createdAt: Date.now(),
    });
    return { assetId, visualPrompt, copy: steal.generatedResponse };
  },
});

export const finishGeneration = internalMutation({
  args: {
    assetId: v.id("publication_assets"),
    kind: v.union(v.literal("image"), v.literal("audio")),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (asset === null) {
      throw new ConvexError({
        code: "ASSET_NOT_FOUND",
        message: "Asset not found",
      });
    }
    await requireBrandOwner(ctx, asset.brandId);
    if (args.error || !args.storageId) {
      await ctx.db.patch(args.assetId, { status: "failed" });
      return;
    }
    await ctx.db.patch(args.assetId, {
      status: "ready",
      ...(args.kind === "image"
        ? { imageStorageId: args.storageId }
        : { audioStorageId: args.storageId }),
    });
  },
});

async function storeFromUrl(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  url: string,
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ConvexError({
      code: "MEDIA_DOWNLOAD_FAILED",
      message: `Could not download generated media (${response.status})`,
    });
  }
  const blob = await response.blob();
  return await ctx.storage.store(blob);
}

async function generateFalImage(prompt: string): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new ConvexError({
      code: "MISSING_FAL_KEY",
      message: "FAL_KEY is not set in the Convex dashboard",
    });
  }

  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, image_size: "square_hd" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "FAL_FAILED",
      message: `fal.ai failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }
  const body = (await response.json()) as {
    images?: Array<{ url?: string }>;
  };
  const url = body.images?.[0]?.url;
  if (!url) {
    throw new ConvexError({
      code: "FAL_FAILED",
      message: "fal.ai returned no image URL",
    });
  }
  return url;
}

async function generateElevenLabsAudio(text: string): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new ConvexError({
      code: "MISSING_ELEVENLABS_KEY",
      message: "ELEVENLABS_API_KEY is not set in the Convex dashboard",
    });
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "ELEVENLABS_FAILED",
      message: `ElevenLabs failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }
  return await response.arrayBuffer();
}

export const generateImage = action({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args): Promise<Id<"publication_assets">> => {
    const prepared = await ctx.runMutation(internal.assets.prepareGeneration, {
      stealId: args.stealId,
      kind: "image",
    });
    try {
      const imageUrl = await generateFalImage(prepared.visualPrompt);
      const storageId = await storeFromUrl(ctx, imageUrl);
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "image",
        storageId,
      });
      return prepared.assetId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Image generation failed";
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "image",
        error: message,
      });
      throw error;
    }
  },
});

export const generateVoice = action({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args): Promise<Id<"publication_assets">> => {
    const prepared = await ctx.runMutation(internal.assets.prepareGeneration, {
      stealId: args.stealId,
      kind: "audio",
    });
    try {
      const audio = await generateElevenLabsAudio(prepared.copy);
      const storageId = await ctx.storage.store(
        new Blob([audio], { type: "audio/mpeg" }),
      );
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "audio",
        storageId,
      });
      return prepared.assetId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice generation failed";
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "audio",
        error: message,
      });
      throw error;
    }
  },
});
