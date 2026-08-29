import type { Id } from "../../convex/_generated/dataModel";

export function analyzePath(brandId: Id<"brands"> | string) {
  return `/brands/${brandId}/analyze`;
}

export function preferencesPath(brandId: Id<"brands"> | string) {
  return `/brands/${brandId}/preferences`;
}

export function composePath(
  brandId: Id<"brands"> | string,
  stealId: Id<"aura_steals"> | string,
) {
  return `/brands/${brandId}/compose/${stealId}`;
}
