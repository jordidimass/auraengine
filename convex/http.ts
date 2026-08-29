import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { oauthCallback } from "./social";

const http = httpRouter();

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: oauthCallback,
});

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Ingest-Secret",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

type IngestPayload = {
  brandId: string;
  url: string;
  platform: "x" | "linkedin";
  content: string;
  authorHandle: string;
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
  };
  topReplies?: string[];
  riskLevel?: number;
  targetPlatform?: "x" | "linkedin";
  userContext?: string;
};

function parseIngestPayload(body: unknown):
  | { ok: true; payload: IngestPayload }
  | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const requiredFields = [
    "brandId",
    "url",
    "platform",
    "content",
    "authorHandle",
    "metrics",
  ] as const;

  for (const field of requiredFields) {
    if (record[field] === undefined || record[field] === null) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof record.brandId !== "string" || record.brandId.length === 0) {
    return { ok: false, error: "brandId must be a non-empty string" };
  }
  if (typeof record.url !== "string" || record.url.trim().length === 0) {
    return { ok: false, error: "url must be a non-empty string" };
  }
  if (record.platform !== "x" && record.platform !== "linkedin") {
    return { ok: false, error: 'platform must be "x" or "linkedin"' };
  }
  if (typeof record.content !== "string" || record.content.trim().length === 0) {
    return { ok: false, error: "content must be a non-empty string" };
  }
  if (
    typeof record.authorHandle !== "string" ||
    record.authorHandle.trim().length === 0
  ) {
    return { ok: false, error: "authorHandle must be a non-empty string" };
  }
  if (record.metrics === null || typeof record.metrics !== "object") {
    return { ok: false, error: "metrics must be an object" };
  }

  const metricsRecord = record.metrics as Record<string, unknown>;
  const metricFields = ["likes", "reposts", "replies"] as const;
  const metrics: IngestPayload["metrics"] = {
    likes: 0,
    reposts: 0,
    replies: 0,
  };

  for (const field of metricFields) {
    const value = metricsRecord[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return {
        ok: false,
        error: `metrics.${field} must be a non-negative number`,
      };
    }
    metrics[field] = value;
  }

  let topReplies: string[] | undefined;
  if (record.topReplies !== undefined) {
    if (!Array.isArray(record.topReplies)) {
      return { ok: false, error: "topReplies must be an array of strings" };
    }
    if (!record.topReplies.every((item) => typeof item === "string")) {
      return { ok: false, error: "topReplies must be an array of strings" };
    }
    topReplies = record.topReplies;
  }

  if (
    record.riskLevel !== undefined &&
    (typeof record.riskLevel !== "number" ||
      !Number.isInteger(record.riskLevel) ||
      record.riskLevel < 0 ||
      record.riskLevel > 100)
  ) {
    return {
      ok: false,
      error: "riskLevel must be an integer between 0 and 100",
    };
  }

  const targetPlatform =
    record.targetPlatform === undefined
      ? record.platform
      : record.targetPlatform;
  if (targetPlatform !== "x" && targetPlatform !== "linkedin") {
    return { ok: false, error: 'targetPlatform must be "x" or "linkedin"' };
  }

  if (
    record.userContext !== undefined &&
    typeof record.userContext !== "string"
  ) {
    return { ok: false, error: "userContext must be a string" };
  }

  return {
    ok: true,
    payload: {
      brandId: record.brandId,
      url: record.url,
      platform: record.platform,
      content: record.content,
      authorHandle: record.authorHandle,
      metrics,
      topReplies,
      riskLevel:
        typeof record.riskLevel === "number" ? record.riskLevel : undefined,
      targetPlatform,
      userContext:
        typeof record.userContext === "string" ? record.userContext : undefined,
    },
  };
}

const ingestPostHandler = httpAction(async (ctx, request) => {
  try {
    const configuredSecret = process.env.INGEST_SECRET;
    if (!configuredSecret || configuredSecret.length === 0) {
      return jsonResponse(
        { success: false, error: "Ingest endpoint is not configured" },
        503,
      );
    }

    const providedSecret = request.headers.get("X-Ingest-Secret");
    if (providedSecret !== configuredSecret) {
      return jsonResponse(
        { success: false, error: "Unauthorized ingest request" },
        401,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const parsed = parseIngestPayload(body);
    if (!parsed.ok) {
      return jsonResponse({ success: false, error: parsed.error }, 400);
    }

    const {
      brandId,
      url,
      platform,
      content,
      authorHandle,
      metrics,
      topReplies,
      riskLevel,
      targetPlatform,
      userContext,
    } = parsed.payload;

    const postId = await ctx.runMutation(internal.analysis.savePostInternal, {
      brandId: brandId as Id<"brands">,
      platform,
      url,
      content,
      authorHandle,
      metrics,
      topReplies,
      status: "analyzing",
    });

    const resolvedRiskLevel =
      riskLevel ??
      (await ctx.runQuery(internal.analysis.getDefaultRiskForPlatform, {
        brandId: brandId as Id<"brands">,
        platform: targetPlatform ?? platform,
      }));

    await ctx.runAction(internal.analysis.analyzePostPipeline, {
      postId,
      riskLevel: resolvedRiskLevel,
      targetPlatform: targetPlatform ?? platform,
      userContext,
    });

    return jsonResponse({ success: true, postId }, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected ingest error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});

http.route({
  path: "/api/ingest-post",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }),
});

http.route({
  path: "/api/ingest-post",
  method: "POST",
  handler: ingestPostHandler,
});

export default http;
