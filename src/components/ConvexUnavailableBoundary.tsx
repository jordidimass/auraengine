"use client";

import { Component, type ReactNode } from "react";

export class ConvexUnavailableBoundary extends Component<
  { children: ReactNode; message?: string },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("ConvexUnavailableBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-6 text-center text-foreground">
          <p className="text-sm font-medium">Something didn&apos;t load</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {this.props.message ??
              "This page hit an error talking to the backend."}
          </p>
          {this.state.error ? (
            <p className="max-w-sm text-[10px] leading-relaxed text-muted-foreground/70">
              {this.state.error.message}
            </p>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
