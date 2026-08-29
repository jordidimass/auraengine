import type { AuthConfig } from "convex/server";

// Requires a Clerk JWT template named "convex" — create it in the Clerk
// dashboard (Configure > JWT Templates) and set CLERK_JWT_ISSUER_DOMAIN to
// your Clerk Frontend API URL (e.g. https://your-app.clerk.accounts.dev).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
