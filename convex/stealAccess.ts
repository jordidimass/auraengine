import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireBrandOwner } from "./authz";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type DatabaseContext =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">;

export async function requireSteal(
  ctx: DatabaseContext,
  stealId: Id<"aura_steals">,
): Promise<{ steal: Doc<"aura_steals">; brand: Doc<"brands"> }> {
  const steal = await ctx.db.get(stealId);
  if (steal === null) {
    throw new ConvexError({
      code: "STEAL_NOT_FOUND",
      message: "Steal not found",
    });
  }
  const brand = await requireBrandOwner(ctx, steal.brandId);
  return { steal, brand };
}
