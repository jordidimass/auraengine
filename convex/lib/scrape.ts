import { ConvexError } from "convex/values";
import type { Platform } from "../domain";
import { detectPlatformFromUrl } from "./risk";

export type ScrapedPost = {
  platform: Platform;
  originalContent: string;
  authorHandle: string;
  metrics: { likes: number; reposts: number; replies: number };
  topReplies: string[];
};

function meta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return undefined;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function handleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").filter(Boolean);
    return path[0] ?? parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function tagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  const text = match?.[1]?.replace(/\s+/g, " ").trim();
  return text ? decodeHtml(text) : undefined;
}

function paragraphTexts(html: string): string[] {
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  return matches
    .map((match) =>
      decodeHtml(
        match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      ),
    )
    .filter((text) => text.length > 20);
}

function isSocialPostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      host === "x.com" ||
      host === "twitter.com" ||
      host === "linkedin.com" ||
      host.endsWith(".linkedin.com")
    );
  } catch {
    return false;
  }
}

export function assertCompetitorPostUrl(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const path = parsed.pathname;

  if (host === "x.com" || host === "twitter.com") {
    if (!/\/status\/\d+\/?$/.test(path) && !/\/status\/\d+\//.test(path)) {
      throw new ConvexError({
        code: "INVALID_POST_URL",
        message:
          "That is not a tweet URL. Copy the post link from X: https://x.com/user/status/1234567890123456789 (numeric status id, not the username).",
      });
    }
  }
}

type ApifyItem = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function authorHandleFromItem(item: ApifyItem): string {
  const author = item.author;
  if (author && typeof author === "object") {
    const nested = author as Record<string, unknown>;
    return (
      asString(nested.userName) ??
      asString(nested.username) ??
      asString(nested.name) ??
      "unknown"
    ).replace(/^@/, "");
  }
  return (
    asString(item.authorHandle) ??
    asString(item.username) ??
    asString(item.handle) ??
    "unknown"
  ).replace(/^@/, "");
}

function textFromItem(item: ApifyItem): string | undefined {
  return (
    asString(item.text) ??
    asString(item.fullText) ??
    asString(item.full_text) ??
    asString(item.content) ??
    asString(item.commentary) ??
    asString(item.markdown)
  );
}

function mapApifyItems(url: string, items: ApifyItem[]): ScrapedPost | null {
  if (items.length === 0) return null;
  const main =
    items.find((item) => item.isReply !== true && textFromItem(item)) ?? items[0];
  const content = textFromItem(main);
  if (!content) return null;
  const replies = items
    .filter((item) => item !== main)
    .map(textFromItem)
    .filter((text): text is string => Boolean(text))
    .slice(0, 5);
  return {
    platform: detectPlatformFromUrl(url),
    originalContent: content.slice(0, 4000),
    authorHandle: authorHandleFromItem(main),
    metrics: {
      likes: asNumber(main.likeCount ?? main.likes ?? main.numLikes),
      reposts: asNumber(main.retweetCount ?? main.reposts ?? main.numShares),
      replies: asNumber(main.replyCount ?? main.comments ?? replies.length),
    },
    topReplies: replies,
  };
}

async function scrapeWithApify(url: string): Promise<ScrapedPost | null> {
  const token = process.env.APIFY_API_TOKEN ?? process.env.APIFY_TOKEN;
  if (!token) return null;

  const platform = detectPlatformFromUrl(url);
  const actor =
    platform === "linkedin"
      ? (process.env.APIFY_LINKEDIN_ACTOR ?? "apify~website-content-crawler")
      : (process.env.APIFY_X_ACTOR ?? "apidojo~tweet-scraper");

  const input =
    actor.includes("website-content-crawler")
      ? { startUrls: [{ url }], maxCrawlPages: 1 }
      : { startUrls: [url], maxItems: 8 };

  const endpoint = new URL(
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items`,
  );
  endpoint.searchParams.set("token", token);
  endpoint.searchParams.set("timeout", "120");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "APIFY_FAILED",
      message: `Apify ${actor} failed (${response.status}): ${detail.slice(0, 280)}`,
    });
  }

  const items = (await response.json()) as unknown;
  if (!Array.isArray(items)) return null;
  return mapApifyItems(url, items as ApifyItem[]);
}

async function scrapeWithExa(url: string): Promise<ScrapedPost | null> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.exa.ai/contents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      urls: [url],
      text: true,
      highlights: { numSentences: 3 },
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    results?: Array<{ text?: string; title?: string; author?: string }>;
  };
  const result = body.results?.[0];
  const text = result?.text?.trim();
  if (!result || !text) return null;
  return {
    platform: detectPlatformFromUrl(url),
    originalContent: text.slice(0, 4000),
    authorHandle: result.author?.replace(/^@/, "") || handleFromUrl(url),
    metrics: { likes: 0, reposts: 0, replies: 0 },
    topReplies: result.title ? [result.title] : [],
  };
}

async function scrapeOpenGraph(url: string): Promise<ScrapedPost> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AuraEngine/0.1; +https://auraengine.dev)",
      Accept: "text/html",
    },
  });
  if (!response.ok) {
    throw new ConvexError({
      code: "SCRAPE_FAILED",
      message: `Could not fetch competitor URL (${response.status})`,
    });
  }
  const html = await response.text();
  const title =
    meta(html, "og:title") ??
    meta(html, "twitter:title") ??
    tagText(html, "title") ??
    tagText(html, "h1");
  const description =
    meta(html, "og:description") ??
    meta(html, "twitter:description") ??
    meta(html, "description") ??
    paragraphTexts(html).slice(0, 3).join("\n\n");
  const content = [title, description].filter(Boolean).join("\n\n").trim();
  if (!content) {
    throw new ConvexError({
      code: "SCRAPE_FAILED",
      message:
        "Could not extract post content from that page.",
    });
  }
  return {
    platform: detectPlatformFromUrl(url),
    originalContent: content.slice(0, 4000),
    authorHandle: handleFromUrl(url),
    metrics: { likes: 0, reposts: 0, replies: 0 },
    topReplies: [],
  };
}

export async function scrapeCompetitorPost(url: string): Promise<ScrapedPost> {
  assertCompetitorPostUrl(url);
  if (isSocialPostUrl(url)) {
    const token = process.env.APIFY_API_TOKEN ?? process.env.APIFY_TOKEN;
    if (!token) {
      throw new ConvexError({
        code: "MISSING_APIFY_TOKEN",
        message:
          "X/LinkedIn need APIFY_API_TOKEN. Set it with: npx convex env set APIFY_API_TOKEN",
      });
    }
    const fromApify = await scrapeWithApify(url);
    if (fromApify) return fromApify;
    throw new ConvexError({
      code: "SCRAPE_FAILED",
      message: "Apify returned no post content for that URL.",
    });
  }

  const fromExa = await scrapeWithExa(url);
  if (fromExa) return fromExa;
  return await scrapeOpenGraph(url);
}
