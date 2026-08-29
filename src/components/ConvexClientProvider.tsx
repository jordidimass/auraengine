"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex =
  convexUrl !== undefined && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (convex === null) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing NEXT_PUBLIC_CONVEX_URL. Set it before running the app.",
      );
    }
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
