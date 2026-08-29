import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireUserId } from "./authz";
import {
  assertPositiveInteger,
  assetKindValidator,
  videoAspectRatioValidator,
} from "./domain";
import { requireSteal } from "./stealAccess";

export const getAssets = query({
  args: { stealId: v.string() },
  handler: async (ctx, args) => {
    const empty = {
      asset: null,
      assets: [],
      imageUrl: null,
      audioUrl: null,
      videoUrl: null,
    };

    const stealId = ctx.db.normalizeId("aura_steals", args.stealId);
    if (stealId === null) {
      return empty;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return empty;
    }

    const steal = await ctx.db.get(stealId);
    if (steal === null) {
      return empty;
    }

    const brand = await ctx.db.get(steal.brandId);
    if (brand === null || brand.userId !== identity.subject) {
      return empty;
    }
    const assets = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", stealId))
      .order("desc")
      .collect();

    const latest = assets[0] ?? null;
    const [imageUrl, audioUrl, videoUrl] = latest
      ? await Promise.all([
          latest.imageStorageId
            ? ctx.storage.getUrl(latest.imageStorageId)
            : Promise.resolve(null),
          latest.audioStorageId
            ? ctx.storage.getUrl(latest.audioStorageId)
            : Promise.resolve(null),
          latest.videoStorageId
            ? ctx.storage.getUrl(latest.videoStorageId)
            : Promise.resolve(null),
        ])
      : [null, null, null];

    return {
      asset: latest,
      assets: await Promise.all(
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
      ),
      imageUrl,
      audioUrl,
      videoUrl,
    };
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
        : args.kind === "audio"
          ? { audioStorageId: args.storageId }
          : {
              videoStorageId: args.storageId,
              videoDurationSeconds: args.videoDurationSeconds,
              videoAspectRatio: args.videoAspectRatio,
            }),
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
    const steal = await ctx.db.get(args.stealId);
    if (steal === null) {
      throw new ConvexError({
        code: "STEAL_NOT_FOUND",
        message: "Steal not found",
      });
    }

    const latest = await ctx.db
      .query("publication_assets")
      .withIndex("by_steal", (q) => q.eq("stealId", args.stealId))
      .order("desc")
      .first();

    if (latest?.status === "generating") {
      const hasMedia =
        latest.imageStorageId !== undefined ||
        latest.audioStorageId !== undefined ||
        latest.videoStorageId !== undefined;
      if (hasMedia) {
        throw new ConvexError({
          code: "ASSET_GENERATION_IN_PROGRESS",
          message: "Wait for the current asset generation to finish",
        });
      }
      await ctx.db.patch(latest._id, { status: "generating" });
      const copy = steal.editedResponse ?? steal.generatedResponse;
      const visualPrompt =
        latest.visualPrompt ||
        `Cyberpunk social post visual for: ${copy.slice(0, 280)}`;
      return {
        assetId: latest._id,
        visualPrompt,
        copy,
      };
    }

    const copy = steal.editedResponse ?? steal.generatedResponse;
    const visualPrompt =
      latest?.visualPrompt ||
      `Cyberpunk social post visual for: ${copy.slice(0, 280)}`;

    if (args.kind === "audio" && latest !== null) {
      await ctx.db.patch(latest._id, { status: "generating" });
      return {
        assetId: latest._id,
        visualPrompt,
        copy,
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
    return { assetId, visualPrompt, copy };
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
    if (args.error || !args.storageId) {
      await ctx.db.patch(args.assetId, {
        status: "failed",
        lastError: args.error,
      });
      return;
    }
    await ctx.db.patch(args.assetId, {
      status: "ready",
      lastError: undefined,
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

function falAuthHeaders(key: string) {
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

function extractFalVideoUrl(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  const video = record.video;
  if (video && typeof video === "object") {
    const url = (video as { url?: unknown }).url;
    if (typeof url === "string" && url.length > 0) {
      return url;
    }
  }
  return typeof record.video_url === "string" ? record.video_url : undefined;
}

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: unknown } | string;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      typeof data.message === "string" &&
      data.message.length > 0
    ) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

async function storeFromUrl(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  url: string,
  fallbackContentType?: string,
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ConvexError({
      code: "MEDIA_DOWNLOAD_FAILED",
      message: `Could not download generated media (${response.status})`,
    });
  }
  const blob = await response.blob();
  const needsType =
    fallbackContentType !== undefined &&
    (!blob.type || blob.type === "application/octet-stream");
  return await ctx.storage.store(
    needsType ? new Blob([blob], { type: fallbackContentType }) : blob,
  );
}

function convexGenerationError(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    return error;
  }
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : fallback;
  return new ConvexError({
    code: "GENERATION_FAILED",
    message,
  });
}

async function generateFalImage(prompt: string): Promise<string> {
  const key = process.env.FAL_KEY?.trim();
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

async function generateOpenAiImage(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ConvexError({
      code: "MISSING_OPENAI_KEY",
      message: "OPENAI_API_KEY is not set in the Convex dashboard",
    });
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 3900),
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "OPENAI_IMAGE_FAILED",
      message: `OpenAI image failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }
  const body = (await response.json()) as {
    data?: Array<{ url?: string }>;
  };
  const url = body.data?.[0]?.url;
  if (!url) {
    throw new ConvexError({
      code: "OPENAI_IMAGE_FAILED",
      message: "OpenAI returned no image URL",
    });
  }
  return url;
}

async function generateImageUrl(prompt: string): Promise<string> {
  try {
    return await generateFalImage(prompt);
  } catch (falError) {
    console.error(
      "fal.ai image failed, trying OpenAI",
      falError instanceof Error ? falError.message : falError,
    );
    try {
      return await generateOpenAiImage(prompt);
    } catch (openAiError) {
      const falMessage = publicErrorMessage(falError, "fal.ai failed");
      const openAiMessage = publicErrorMessage(openAiError, "OpenAI failed");
      throw new ConvexError({
        code: "IMAGE_GENERATION_FAILED",
        message: `${falMessage} | ${openAiMessage}`.slice(0, 400),
      });
    }
  }
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

  const motionPrompt = `${prompt.slice(0, 2200)}. Cinematic ${duration}s social clip, subtle camera motion, no on-screen text.`;
  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: falAuthHeaders(key),
    body: JSON.stringify({
      prompt: motionPrompt,
      duration: String(duration),
      aspect_ratio: aspectRatio,
    }),
  });
  if (!submit.ok) {
    const detail = await submit.text();
    throw new ConvexError({
      code: "FAL_VIDEO_FAILED",
      message: `fal.ai video generation failed (${submit.status}): ${detail.slice(0, 300)}`,
    });
  }

  const submitted = (await submit.json()) as {
    request_id?: string;
    video?: { url?: string };
    video_url?: string;
  };
  const immediateUrl = extractFalVideoUrl(submitted);
  if (immediateUrl) {
    return immediateUrl;
  }

  const requestId = submitted.request_id;
  if (!requestId || !/^[a-zA-Z0-9_-]+$/.test(requestId)) {
    throw new ConvexError({
      code: "FAL_VIDEO_FAILED",
      message: "fal.ai returned no video URL or request id",
    });
  }

  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const statusResponse = await fetch(
      `https://queue.fal.run/${model}/requests/${requestId}/status`,
      { headers: { Authorization: `Key ${key}` } },
    );
    if (!statusResponse.ok) {
      const detail = await statusResponse.text();
      throw new ConvexError({
        code: "FAL_VIDEO_FAILED",
        message: `fal.ai video status failed (${statusResponse.status}): ${detail.slice(0, 300)}`,
      });
    }
    const statusBody = (await statusResponse.json()) as {
      status?: string;
      error?: string;
    };
    if (statusBody.status === "FAILED") {
      throw new ConvexError({
        code: "FAL_VIDEO_FAILED",
        message:
          statusBody.error?.slice(0, 300) ??
          "fal.ai marked the video job as failed",
      });
    }
    if (statusBody.status !== "COMPLETED") {
      continue;
    }

    const resultResponse = await fetch(
      `https://queue.fal.run/${model}/requests/${requestId}`,
      { headers: { Authorization: `Key ${key}` } },
    );
    if (!resultResponse.ok) {
      const detail = await resultResponse.text();
      throw new ConvexError({
        code: "FAL_VIDEO_FAILED",
        message: `fal.ai video result failed (${resultResponse.status}): ${detail.slice(0, 300)}`,
      });
    }
    const url = extractFalVideoUrl(await resultResponse.json());
    if (!url) {
      throw new ConvexError({
        code: "FAL_VIDEO_FAILED",
        message: "fal.ai returned no video URL",
      });
    }
    return url;
  }

  throw new ConvexError({
    code: "FAL_VIDEO_FAILED",
    message: "fal.ai video generation timed out after 8 minutes",
  });
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
  returns: v.id("publication_assets"),
  handler: async (ctx, args): Promise<Id<"publication_assets">> => {
    const userId = await requireUserId(ctx);
    await ctx.runQuery(internal.analysis.verifyStealOwner, {
      stealId: args.stealId,
      userId,
    });

    const prepared = await ctx.runMutation(internal.assets.prepareGeneration, {
      stealId: args.stealId,
      kind: "image",
    });
    try {
      const imageUrl = await generateImageUrl(prepared.visualPrompt);
      const storageId = await storeFromUrl(ctx, imageUrl, "image/jpeg");
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "image",
        storageId,
      });
      return prepared.assetId;
    } catch (error) {
      const convexError = convexGenerationError(error, "Image generation failed");
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "image",
        error: publicErrorMessage(convexError, "Image generation failed"),
      });
      throw convexError;
    }
  },
});

export const generateVoice = action({
  args: { stealId: v.id("aura_steals") },
  handler: async (ctx, args): Promise<Id<"publication_assets">> => {
    const userId = await requireUserId(ctx);
    await ctx.runQuery(internal.analysis.verifyStealOwner, {
      stealId: args.stealId,
      userId,
    });

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
      const message = publicErrorMessage(error, "Voice generation failed");
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: prepared.assetId,
        kind: "audio",
        error: message,
      });
      throw error;
    }
  },
});

export const continueGenerateVideo = internalAction({
  args: {
    assetId: v.id("publication_assets"),
    visualPrompt: v.string(),
    duration: v.union(v.literal(5), v.literal(10)),
    aspectRatio: videoAspectRatioValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const videoUrl = await generateFalVideo(
        args.visualPrompt,
        args.duration,
        args.aspectRatio,
      );
      const storageId = await storeFromUrl(ctx, videoUrl, "video/mp4");
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: args.assetId,
        kind: "video",
        storageId,
        videoDurationSeconds: args.duration,
        videoAspectRatio: args.aspectRatio,
      });
    } catch (error) {
      await ctx.runMutation(internal.assets.finishGeneration, {
        assetId: args.assetId,
        kind: "video",
        error: publicErrorMessage(error, "Video generation failed"),
      });
    }
    return null;
  },
});

export const generateVideo = action({
  args: {
    stealId: v.id("aura_steals"),
    duration: v.optional(v.union(v.literal(5), v.literal(10))),
    aspectRatio: v.optional(videoAspectRatioValidator),
  },
  returns: v.id("publication_assets"),
  handler: async (
    ctx,
    args,
  ): Promise<Id<"publication_assets">> => {
    const userId = await requireUserId(ctx);
    await ctx.runQuery(internal.analysis.verifyStealOwner, {
      stealId: args.stealId,
      userId,
    });

    const duration = args.duration ?? 5;
    const aspectRatio = args.aspectRatio ?? "1:1";
    const prepared = await ctx.runMutation(internal.assets.prepareGeneration, {
      stealId: args.stealId,
      kind: "video",
    });
    await ctx.scheduler.runAfter(0, internal.assets.continueGenerateVideo, {
      assetId: prepared.assetId,
      visualPrompt: prepared.visualPrompt,
      duration,
      aspectRatio,
    });
    return prepared.assetId;
  },
});
