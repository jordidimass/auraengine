import { ConvexError } from "convex/values";
import { assertHttpUrl, type Platform } from "../domain";

export function detectPlatformFromUrl(url: string): Platform {
  assertHttpUrl(url, "url");
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    return "linkedin";
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return "instagram";
  }
  return "x";
}

export function riskRegister(
  level: number,
): "diplomatic" | "educational" | "direct" | "roast" {
  if (level <= 25) return "diplomatic";
  if (level <= 50) return "educational";
  if (level <= 75) return "direct";
  return "roast";
}

export function requireIntegerRisk(level: number, field = "riskLevel") {
  const rounded = Math.round(level);
  if (!Number.isInteger(rounded) || rounded < 0 || rounded > 100) {
    throw new ConvexError({
      code: "INVALID_RISK_LEVEL",
      message: `${field} must be an integer from 0 to 100`,
    });
  }
  return rounded;
}
