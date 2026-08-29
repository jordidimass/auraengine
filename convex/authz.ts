import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext = Pick<QueryCtx, "auth"> | Pick<MutationCtx, "auth">;
type DatabaseContext =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">;

export async function requireUserId(ctx: AuthContext): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in",
    });
  }
  return userId;
}

export async function requireBrandOwner(
  ctx: DatabaseContext,
  brandId: Id<"brands">,
  options: { allowArchived?: boolean } = {},
) {
  const userId = await requireUserId(ctx);
  const brand = await ctx.db.get(brandId);

  if (brand === null || brand.userId !== userId) {
    throw new ConvexError({
      code: "BRAND_NOT_FOUND",
      message: "Brand not found",
    });
  }

  if (brand.archived && !options.allowArchived) {
    throw new ConvexError({
      code: "BRAND_ARCHIVED",
      message: "This brand is archived",
    });
  }

  return brand;
}
