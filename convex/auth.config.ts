import type { AuthConfig } from "convex/server";

// Clerk must mint a JWT with aud: "convex". Either:
// 1. Clerk Dashboard → JWT Templates → New → Convex (name must be "convex"), or
// 2. Clerk Dashboard → Integrations → Convex → Activate
// (https://dashboard.clerk.com/apps/setup/convex)
//
// Domain is the Clerk Frontend API URL for THIS instance
// (dev: https://verb-noun-00.clerk.accounts.dev).
const clerkIssuer =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? process.env.CLERK_FRONTEND_API_URL;

export default {
  providers: [
    {
      domain: clerkIssuer!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
