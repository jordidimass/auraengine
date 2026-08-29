import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireBrandOwner, requireUserId } from "./authz";
import { defaultPreferenceFor } from "./brandDefaults";
import {
  assertHttpUrl,
  assertNonEmpty,
  normalizeOptionalText,
} from "./domain";

const nullableOptionalString = v.optional(v.union(v.string(), v.null()));

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return [];
    }
    return await ctx.db
      .query("brands")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", identity.subject).eq("archived", false),
      )
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { brandId: v.string() },
  handler: async (ctx, args) => {
    const brandId = ctx.db.normalizeId("brands", args.brandId);
    if (brandId === null) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }

    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== identity.subject || brand.archived) {
      return null;
    }

    const preferences = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();

    return {
      ...brand,
      preferences: preferences.sort((a, b) =>
        a.platform.localeCompare(b.platform),
      ),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    assertNonEmpty(args.name, "name");
    assertNonEmpty(args.description, "description");

    const website = normalizeOptionalText(args.website);
    if (website !== undefined) {
      assertHttpUrl(website, "website");
    }

    const brandId = await ctx.db.insert("brands", {
      userId,
      name: args.name.trim(),
      website,
      industry: normalizeOptionalText(args.industry),
      description: args.description.trim(),
      archived: false,
      createdAt: Date.now(),
    });

    for (const platform of ["x", "linkedin"] as const) {
      await ctx.db.insert("brand_preferences", {
        brandId,
        ...defaultPreferenceFor(platform),
      });
    }

    return brandId;
  },
});

export const update = mutation({
  args: {
    brandId: v.id("brands"),
    name: v.optional(v.string()),
    website: nullableOptionalString,
    industry: nullableOptionalString,
    description: v.optional(v.string()),
    logoUrl: nullableOptionalString,
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const updates: Partial<
      Pick<
        Doc<"brands">,
        "name" | "website" | "industry" | "description" | "logoUrl"
      >
    > = {};

    if (args.name !== undefined) {
      assertNonEmpty(args.name, "name");
      updates.name = args.name.trim();
    }
    if (args.description !== undefined) {
      assertNonEmpty(args.description, "description");
      updates.description = args.description.trim();
    }
    if (args.website !== undefined) {
      updates.website = normalizeOptionalText(args.website);
      if (updates.website !== undefined) {
        assertHttpUrl(updates.website, "website");
      }
    }
    if (args.industry !== undefined) {
      updates.industry = normalizeOptionalText(args.industry);
    }
    if (args.logoUrl !== undefined) {
      updates.logoUrl = normalizeOptionalText(args.logoUrl);
      if (updates.logoUrl !== undefined) {
        assertHttpUrl(updates.logoUrl, "logoUrl");
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ConvexError({
        code: "NO_CHANGES",
        message: "At least one field must be provided",
      });
    }

    await ctx.db.patch(args.brandId, updates);
    return null;
  },
});

export const archive = mutation({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    const brand = await requireBrandOwner(ctx, args.brandId, {
      allowArchived: true,
    });
    if (!brand.archived) {
      await ctx.db.patch(args.brandId, { archived: true });
    }
    return null;
  },
});
