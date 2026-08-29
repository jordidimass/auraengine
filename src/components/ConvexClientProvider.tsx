"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { ConvexUnavailableBoundary } from "./ConvexUnavailableBoundary";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex =
  convexUrl !== undefined && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;

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
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ConvexUnavailableBoundary>
  );
}
