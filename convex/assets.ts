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
import {
  assertPositiveInteger,
  assetKindValidator,
  videoAspectRatioValidator,
} from "./domain";
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
        videoUrl: asset.videoStorageId
          ? await ctx.storage.getUrl(asset.videoStorageId)
          : null,
        videoDurationSeconds: asset.videoDurationSeconds ?? null,
        videoAspectRatio: asset.videoAspectRatio ?? null,
      })),
    );
  },
});

export const generateUploadUrl = mutation({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args) => {
    await requireSteal(ctx, args.stealId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAsset = mutation({
  args: {
    stealId: v.id("aura_steals"),
    kind: assetKindValidator,
    storageId: v.id("_storage"),
    videoDurationSeconds: v.optional(v.number()),
    videoAspectRatio: v.optional(videoAspectRatioValidator),
  },
  handler: async (ctx, args) => {
    if (args.videoDurationSeconds !== undefined) {
      assertPositiveInteger(args.videoDurationSeconds, "videoDurationSeconds");
    }
    const { steal } = await requireSteal(ctx, args.stealId);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (metadata === null) {
      throw new ConvexError({
        code: "ASSET_FILE_NOT_FOUND",
        message: "The uploaded file does not exist",
      });
    }
    const expectedContentTypePrefix = `${args.kind}/`;
    if (
      metadata.contentType === undefined ||
      !metadata.contentType.startsWith(expectedContentTypePrefix)
    ) {
      throw new ConvexError({
        code: "INVALID_ASSET_CONTENT_TYPE",
        message: `${args.kind} assets require a ${expectedContentTypePrefix}* content type`,
      });
    }

    const latest = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();
    if (latest?.status === "generating") {
      throw new ConvexError({
        code: "ASSET_GENERATION_IN_PROGRESS",
        message: "Wait for the current asset generation to finish",
      });
    }

    const mediaFields =
      args.kind === "image"
        ? { imageStorageId: args.storageId }
        : args.kind === "audio"
          ? { audioStorageId: args.storageId }
          : {
              videoStorageId: args.storageId,
              videoDurationSeconds: args.videoDurationSeconds,
              videoAspectRatio: args.videoAspectRatio,
            };

    if (latest === null) {
      await ctx.db.insert("publication_assets", {
        stealId: args.stealId,
        brandId: steal.brandId,
        visualPrompt: `Cyberpunk social post visual for: ${steal.generatedResponse.slice(0, 280)}`,
        status: "ready",
        generation: 1,
        createdAt: Date.now(),
        ...mediaFields,
      });
      return null;
    }

    await ctx.db.patch(latest._id, {
      brandId: steal.brandId,
      status: "ready",
      ...mediaFields,
    });
    return null;
  },
});

export const prepareGeneration = internalMutation({
  args: {
    stealId: v.id("aura_steals"),
    kind: assetKindValidator,
  },
  handler: async (ctx, args) => {
    const { steal } = await requireSteal(ctx, args.stealId);
    const latest = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    if (latest?.status === "generating") {
      throw new ConvexError({
        code: "ASSET_GENERATION_IN_PROGRESS",
        message: "Wait for the current asset generation to finish",
      });
    }

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
      args.kind === "audio"
        ? (latest?.generation ?? 1)
        : (latest?.generation ?? 0) + 1;

    const assetId = await ctx.db.insert("publication_assets", {
      stealId: args.stealId,
      brandId: steal.brandId,
      visualPrompt,
      status: "generating",
      generation: Math.max(nextGeneration, 1),
      imageStorageId: latest?.imageStorageId,
      audioStorageId: latest?.audioStorageId,
      videoStorageId: latest?.videoStorageId,
      videoDurationSeconds: latest?.videoDurationSeconds,
      videoAspectRatio: latest?.videoAspectRatio,
      createdAt: Date.now(),
    });
    return { assetId, visualPrompt, copy: steal.generatedResponse };
  },
});

export const finishGeneration = internalMutation({
  args: {
    assetId: v.id("publication_assets"),
    kind: assetKindValidator,
    storageId: v.optional(v.id("_storage")),
    videoDurationSeconds: v.optional(v.number()),
    videoAspectRatio: v.optional(videoAspectRatioValidator),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.videoDurationSeconds !== undefined) {
      assertPositiveInteger(args.videoDurationSeconds, "videoDurationSeconds");
    }
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
        : args.kind === "audio"
          ? { audioStorageId: args.storageId }
          : {
              videoStorageId: args.storageId,
              videoDurationSeconds: args.videoDurationSeconds,
              videoAspectRatio: args.videoAspectRatio,
            }),
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

async function generateFalVideo(
  prompt: string,
  duration: 5 | 10,
  aspectRatio: "16:9" | "9:16" | "1:1",
): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new ConvexError({
      code: "MISSING_FAL_KEY",
      message: "FAL_KEY is not set in the Convex dashboard",
    });
  }

  const model =
    process.env.FAL_VIDEO_MODEL ??
    "fal-ai/kling-video/v1/standard/text-to-video";
  if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(model)) {
    throw new ConvexError({
      code: "INVALID_FAL_VIDEO_MODEL",
      message: "FAL_VIDEO_MODEL must be a valid fal.ai model identifier",
    });
  }

  const response = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 2500),
      duration: String(duration),
      aspect_ratio: aspectRatio,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "FAL_VIDEO_FAILED",
      message: `fal.ai video generation failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }
  const body = (await response.json()) as {
    video?: { url?: string };
  };
  const url = body.video?.url;
  if (!url) {
    throw new ConvexError({
      code: "FAL_VIDEO_FAILED",
      message: "fal.ai returned no video URL",
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

export const generateVideo = action({
  args: {
    stealId: v.id("aura_steals"),
    duration: v.optional(v.union(v.literal(5), v.literal(10))),
    aspectRatio: v.optional(videoAspectRatioValidator),
  },
  handler: async (ctx, args): Promise<Id<"publication_assets">> => {
    const duration = args.duration ?? 5;
    const aspectRatio = args.aspectRatio ?? "1:1";
    const prepared = await ctx.runMutation(internal.assets.prepareGeneration, {
      stealId: args.stealId,
      kind: "video",
    });
    try {
      const videoUrl = await generateFalVideo(
        prepared.visualPrompt,
        duration,
        aspectRatio,
      );
      const storageId = await storeFromUrl(ctx, videoUrl);
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "video",
        storageId,
        videoDurationSeconds: duration,
        videoAspectRatio: aspectRatio,
      });
      return prepared.assetId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Video generation failed";
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "video",
        error: message,
      });
      throw error;
    }
  },
});
