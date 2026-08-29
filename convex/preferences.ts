import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { defaultPreferenceFor } from "./brandDefaults";
import {
  assertPositiveInteger,
  assertRiskLevel,
  normalizeOptionalText,
  normalizeStringList,
  platformValidator,
  toneValidator,
} from "./domain";

export const getByBrand = query({
  args: { brandId: v.string() },
  handler: async (ctx, args) => {
    const brandId = ctx.db.normalizeId("brands", args.brandId);
    if (brandId === null) {
      return [];
    }
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return [];
    }
    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== identity.subject) {
      return [];
    }
    const preferences = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand", (q) => q.eq("brandId", brandId))
      .collect();
    return preferences.sort((a, b) =>
      a.platform.localeCompare(b.platform),
    );
  },
});

export const upsert = mutation({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
    tone: toneValidator,
    defaultRiskLevel: v.number(),
    maxLength: v.number(),
    useEmojis: v.boolean(),
    useHashtags: v.boolean(),
    customInstructions: v.union(v.string(), v.null()),
    bannedPhrases: v.array(v.string()),
    bannedTopics: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    assertRiskLevel(args.defaultRiskLevel, "defaultRiskLevel");
    assertPositiveInteger(args.maxLength, "maxLength");

    const existing = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.platform),
      )
      .unique();
    const values = {
      tone: args.tone,
      defaultRiskLevel: args.defaultRiskLevel,
      maxLength: args.maxLength,
      useEmojis: args.useEmojis,
      useHashtags: args.useHashtags,
      customInstructions: normalizeOptionalText(args.customInstructions),
      bannedPhrases: normalizeStringList(args.bannedPhrases, "bannedPhrases"),
      bannedTopics: normalizeStringList(args.bannedTopics, "bannedTopics"),
    };

    if (existing === null) {
      await ctx.db.insert("brand_preferences", {
        brandId: args.brandId,
        platform: args.platform,
        enabled: true,
        ...values,
      });
    } else {
      await ctx.db.patch(existing._id, values);
    }
    return null;
  },
});

export const togglePlatform = mutation({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const existing = await ctx.db
      .query("brand_preferences")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.platform),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("brand_preferences", {
        brandId: args.brandId,
        ...defaultPreferenceFor(args.platform),
        enabled: args.enabled,
      });
    } else if (existing.enabled !== args.enabled) {
      await ctx.db.patch(existing._id, { enabled: args.enabled });
    }
    return null;
  },
});
