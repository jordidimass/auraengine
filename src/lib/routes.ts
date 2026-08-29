import type { Id } from "../../convex/_generated/dataModel";

export const DEMO_BRAND_ID = "demo";

export const dashboardPath = (brandId: string = DEMO_BRAND_ID) =>
  `/brands/${brandId}/analyze`;

export const analyzePath = (brandId: Id<"brands"> | string) =>
  `/brands/${brandId}/analyze`;

export const preferencesPath = (brandId: Id<"brands"> | string = DEMO_BRAND_ID) =>
  `/brands/${brandId}/preferences`;

export const composePath = (
  brandId: Id<"brands"> | string,
  stealId: Id<"aura_steals"> | string,
) => `/brands/${brandId}/compose/${stealId}`;

export const DASHBOARD_PATH = dashboardPath();
