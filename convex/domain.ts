import { ConvexError, v } from "convex/values";

export const platformValidator = v.union(
  v.literal("x"),
  v.literal("linkedin"),
);

export const toneValidator = v.union(
  v.literal("formal"),
  v.literal("technical"),
  v.literal("roast"),
  v.literal("casual"),
);

export const competitorPostStatusValidator = v.union(
  v.literal("scraping"),
  v.literal("analyzing"),
  v.literal("ready"),
  v.literal("failed"),
);

export const assetStatusValidator = v.union(
  v.literal("generating"),
  v.literal("ready"),
  v.literal("failed"),
);

export const publicationModeValidator = v.union(
  v.literal("live"),
  v.literal("draft"),
);

export const publicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("publishing"),
  v.literal("sent"),
  v.literal("failed"),
);

export const socialAccountStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("revoked"),
);

export type Platform = "x" | "linkedin";

export function assertNonEmpty(value: string, field: string) {
  if (value.trim().length === 0) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} cannot be empty`,
    });
  }
}

export function assertHttpUrl(value: string, field: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} must be a valid HTTP(S) URL`,
    });
  }
}

export function assertRiskLevel(value: number, field = "riskLevel") {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new ConvexError({
      code: "INVALID_RISK_LEVEL",
      message: `${field} must be an integer from 0 to 100`,
    });
  }
}

export function assertPositiveInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} must be a positive integer`,
    });
  }
}

export function normalizeOptionalText(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}

export function normalizeStringList(values: string[], field: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length !== values.length) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message: `${field} cannot contain empty values`,
    });
  }
  return [...new Set(normalized)];
}
