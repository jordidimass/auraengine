import type { Id } from "../../convex/_generated/dataModel";

export const DEMO_BRAND_ID = "demo";

export function analyzePath(brandId: Id<"brands"> | string = DEMO_BRAND_ID) {
  return `/brands/${brandId}/analyze`;
}

// Alias: some components (AppSidebar) refer to the analyze page as "the
// dashboard" since it's the default landing spot after sign-in.
export const dashboardPath = analyzePath;

export function preferencesPath(
  brandId: Id<"brands"> | string = DEMO_BRAND_ID,
) {
  return `/brands/${brandId}/preferences`;
}

export function historyPath(
  brandId: Id<"brands"> | string = DEMO_BRAND_ID,
) {
  return `/brands/${brandId}/history`;
}

export function composePath(
  brandId: Id<"brands"> | string,
  stealId: Id<"aura_steals"> | string,
) {
  return `/brands/${brandId}/compose/${stealId}`;
}

// "/brands/demo/analyze" isn't a real Convex id, so post-auth redirects go
// home instead — the homepage lists the signed-in user's real brands.
export const DASHBOARD_PATH = "/";

export function isBrandDocumentId(
  value: string | undefined,
): value is Id<"brands"> {
  return looksLikeDocumentId(value);
}

export function isStealDocumentId(
  value: string | undefined,
): value is Id<"aura_steals"> {
  return looksLikeDocumentId(value);
}

function looksLikeDocumentId(value: string | undefined): boolean {
  return (
    typeof value === "string" &&
    value !== DEMO_BRAND_ID &&
    /^[a-z0-9]+$/.test(value) &&
    value.length >= 16
  );
}
