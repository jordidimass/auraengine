import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireBrandOwner } from "./authz";
import { platformValidator, type Platform } from "./domain";

type OAuthState = {
  brandId: Id<"brands">;
  platform: Platform;
  exp: number;
};

function siteUrl() {
  return process.env.CONVEX_SITE_URL ?? "";
}

function appUrl() {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

function callbackUrl() {
  return `${siteUrl()}/oauth/callback`;
}

async function signState(payload: OAuthState): Promise<string> {
  const secret = process.env.OAUTH_STATE_SECRET ?? "aura-engine-dev-state";
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${body}.${sig}`;
}

async function readState(state: string): Promise<OAuthState> {
  const secret = process.env.OAUTH_STATE_SECRET ?? "aura-engine-dev-state";
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    throw new ConvexError({
      code: "INVALID_OAUTH_STATE",
      message: "Invalid OAuth state",
    });
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(body),
  );
  if (!ok) {
    throw new ConvexError({
      code: "INVALID_OAUTH_STATE",
      message: "Invalid OAuth state signature",
    });
  }
  const payload = JSON.parse(atob(body)) as OAuthState;
  if (payload.exp < Date.now()) {
    throw new ConvexError({
      code: "INVALID_OAUTH_STATE",
      message: "OAuth state expired",
    });
  }
  return payload;
}

function pkceVerifier(brandId: string, platform: string) {
  const raw = `${brandId}:${platform}:${process.env.OAUTH_STATE_SECRET ?? "aura-engine-dev-state"}`;
  return raw.replace(/[^a-zA-Z0-9]/g, "x").padEnd(64, "0").slice(0, 64);
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export const listConnected = query({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
    const accounts = await ctx.db
      .query("social_accounts")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .collect();
    return accounts.map((account) => ({
      _id: account._id,
      brandId: account.brandId,
      platform: account.platform,
      externalAccountId: account.externalAccountId,
      handle: account.handle,
      status: account.status,
      expiresAt: account.expiresAt,
    }));
  },
});

export const assertBrandOwner = internalQuery({
  args: { brandId: v.id("brands") },
  handler: async (ctx, args) => {
    await requireBrandOwner(ctx, args.brandId);
  },
});

export const upsertAccount = internalMutation({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
    externalAccountId: v.string(),
    handle: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("social_accounts")
      .withIndex("by_brand_platform", (q) =>
        q.eq("brandId", args.brandId).eq("platform", args.platform),
      )
      .unique();
    const fields = {
      externalAccountId: args.externalAccountId,
      handle: args.handle,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      status: "active" as const,
    };
    if (existing !== null) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("social_accounts", {
      brandId: args.brandId,
      platform: args.platform,
      ...fields,
    });
  },
});

export const startOAuth = action({
  args: {
    brandId: v.id("brands"),
    platform: platformValidator,
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    await ctx.runQuery(internal.social.assertBrandOwner, {
      brandId: args.brandId,
    });

    const state = await signState({
      brandId: args.brandId,
      platform: args.platform,
      exp: Date.now() + 10 * 60 * 1000,
    });
    const redirectUri = callbackUrl();

    if (args.platform === "x") {
      const clientId = process.env.AUTH_X_CLIENT_ID;
      if (!clientId) {
        throw new ConvexError({
          code: "MISSING_X_OAUTH",
          message: "AUTH_X_CLIENT_ID is not set",
        });
      }
      const challenge = await pkceChallenge(
        pkceVerifier(args.brandId, args.platform),
      );
      const url = new URL("https://twitter.com/i/oauth2/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set(
        "scope",
        "tweet.read tweet.write users.read offline.access",
      );
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      return { url: url.toString() };
    }

    const clientId = process.env.AUTH_LINKEDIN_CLIENT_ID;
    if (!clientId) {
      throw new ConvexError({
        code: "MISSING_LINKEDIN_OAUTH",
        message: "AUTH_LINKEDIN_CLIENT_ID is not set",
      });
    }
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "openid profile w_member_social");
    url.searchParams.set("state", state);
    return { url: url.toString() };
  },
});

async function exchangeX(code: string, brandId: string, platform: string) {
  const clientId = process.env.AUTH_X_CLIENT_ID;
  const clientSecret = process.env.AUTH_X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ConvexError({
      code: "MISSING_X_OAUTH",
      message: "X OAuth env vars are missing",
    });
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl(),
    code_verifier: pkceVerifier(brandId, platform),
  });
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new ConvexError({
      code: "X_OAUTH_FAILED",
      message: `X token exchange failed (${response.status})`,
    });
  }
  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const me = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!me.ok) {
    throw new ConvexError({
      code: "X_OAUTH_FAILED",
      message: "Could not read X profile",
    });
  }
  const profile = (await me.json()) as {
    data?: { id: string; username: string };
  };
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in
      ? Date.now() + token.expires_in * 1000
      : undefined,
    externalAccountId: profile.data?.id ?? "x",
    handle: profile.data?.username ?? "x",
  };
}

async function exchangeLinkedIn(code: string) {
  const clientId = process.env.AUTH_LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.AUTH_LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ConvexError({
      code: "MISSING_LINKEDIN_OAUTH",
      message: "LinkedIn OAuth env vars are missing",
    });
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl(),
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!response.ok) {
    throw new ConvexError({
      code: "LINKEDIN_OAUTH_FAILED",
      message: `LinkedIn token exchange failed (${response.status})`,
    });
  }
  const token = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const me = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = me.ok
    ? ((await me.json()) as { sub?: string; name?: string })
    : {};
  return {
    accessToken: token.access_token,
    expiresAt: token.expires_in
      ? Date.now() + token.expires_in * 1000
      : undefined,
    externalAccountId: profile.sub ?? "linkedin",
    handle: profile.name ?? "linkedin",
  };
}

export const oauthCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const fail = (message: string) =>
    new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl()}/login?oauthError=${encodeURIComponent(message)}`,
      },
    });

  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail("Missing OAuth code");

  try {
    const payload = await readState(state);
    const tokens =
      payload.platform === "x"
        ? await exchangeX(code, payload.brandId, payload.platform)
        : await exchangeLinkedIn(code);

    await ctx.runMutation(internal.social.upsertAccount, {
      brandId: payload.brandId,
      platform: payload.platform,
      ...tokens,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl()}/brands/${payload.brandId}/preferences`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    return fail(message);
  }
});
