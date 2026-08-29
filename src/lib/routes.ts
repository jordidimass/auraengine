export const DEMO_BRAND_ID = "demo";

export const dashboardPath = (brandId: string = DEMO_BRAND_ID) =>
  `/brands/${brandId}/analyze`;

export const preferencesPath = (brandId: string = DEMO_BRAND_ID) =>
  `/brands/${brandId}/preferences`;

export const DASHBOARD_PATH = dashboardPath();
