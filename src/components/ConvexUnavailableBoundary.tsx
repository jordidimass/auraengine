"use client";

import { Component, type ReactNode } from "react";

export class ConvexUnavailableBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-6 text-center text-foreground">
          <p className="text-sm font-medium">Backend not connected yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            This page needs Convex, which hasn&apos;t been linked to a
            deployment yet. Run <code>npx convex dev</code> and set{" "}
            <code>NEXT_PUBLIC_CONVEX_URL</code> to fix this.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
