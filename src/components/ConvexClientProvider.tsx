"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { ConvexUnavailableBoundary } from "./ConvexUnavailableBoundary";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex =
  convexUrl !== undefined && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;

function useAuthForConvex() {
  const auth = useAuth();
  const { getToken } = auth;

  const getTokenForConvex = useCallback(
    async (options?: { template?: "convex"; skipCache?: boolean }) => {
      if (options?.template !== "convex") {
        return getToken(options);
      }

      try {
        const templated = await getToken({
          template: "convex",
          skipCache: options.skipCache,
        });
        if (templated) {
          return templated;
        }
      } catch {
        // Clerk 404s /v1/.../tokens/convex when the "convex" JWT template
        // is missing. Fall through to the session token (Convex integration).
      }

      return getToken({ skipCache: options.skipCache });
    },
    [getToken],
  );

  return { ...auth, getToken: getTokenForConvex };
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (convex === null) {
    // No deployment linked yet (`npx convex dev` / `npx convex deploy` has
    // never run). Pages that don't touch Convex — the signed-out marketing
    // page — still render fine with no provider; anything calling
    // useQuery/useAction throws "Could not find Convex client", caught below.
    return (
      <ConvexUnavailableBoundary message="NEXT_PUBLIC_CONVEX_URL isn't set. Run `npx convex dev` and set it to fix this.">
        {children}
      </ConvexUnavailableBoundary>
    );
  }

  return (
    <ConvexUnavailableBoundary>
      <ConvexProviderWithClerk client={convex} useAuth={useAuthForConvex}>
        {children}
      </ConvexProviderWithClerk>
    </ConvexUnavailableBoundary>
  );
}
