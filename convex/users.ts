import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

type DatabaseContext =
  | Pick<QueryCtx, "auth" | "db">
  | Pick<MutationCtx, "auth" | "db">;

export const getUserIdByClerk = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Id<"users"> | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    return user?._id ?? null;
  },
});

export async function requireUserId(ctx: DatabaseContext): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in",
    });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (user === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User profile not found. Call users.ensure after sign-in.",
    });
  }

  return user._id;
}

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "You must be signed in",
      });
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing !== null) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? undefined,
      name: identity.name ?? undefined,
      createdAt: Date.now(),
    });
  },
});
