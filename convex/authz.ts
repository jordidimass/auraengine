import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext =
  | Pick<QueryCtx, "auth">
  | Pick<MutationCtx, "auth">
  | Pick<ActionCtx, "auth">;
type DatabaseContext =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">;

// Clerk user id (identity.subject), not a Convex `users` table id — there is
// no `users` table now that auth is handled by Clerk.
export async function requireUserId(ctx: AuthContext): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in",
    });
  }
  return identity.subject;
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
