"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DASHBOARD_PATH } from "@/lib/routes";

export function AuthControls({
  variant = "nav",
}: {
  variant?: "nav" | "hero" | "sidebar";
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const hero = variant === "hero";

  if (!isLoaded) {
    return (
      <Skeleton className={hero ? "h-11 w-full sm:w-56" : "h-8 w-28"} />
    );
  }

  if (!isSignedIn) {
    return (
      <div
        className={
          hero
            ? "flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
            : "flex items-center gap-2"
        }
      >
        <SignInButton
          mode="modal"
          fallbackRedirectUrl={DASHBOARD_PATH}
          signUpFallbackRedirectUrl={DASHBOARD_PATH}
        >
          <span
            className={cn(
              buttonVariants({
                variant: hero ? "outline" : "ghost",
                size: hero ? "lg" : "default",
              }),
              hero && "h-11 w-full sm:w-auto",
            )}
          >
            Sign in
          </span>
        </SignInButton>
        <SignUpButton
          mode="modal"
          fallbackRedirectUrl={DASHBOARD_PATH}
          signInFallbackRedirectUrl={DASHBOARD_PATH}
        >
          <span
            className={cn(
              buttonVariants({ size: hero ? "lg" : "default" }),
              hero && "h-11 w-full sm:w-auto",
            )}
          >
            Get started
          </span>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div
      className={
        hero
          ? "flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center"
          : "flex items-center gap-2"
      }
    >
      {variant !== "sidebar" ? (
        <Button asChild size={hero ? "lg" : "default"} className={hero ? "h-11 w-full sm:w-auto" : undefined}>
          <Link href={DASHBOARD_PATH}>Open dashboard</Link>
        </Button>
      ) : null}
      <UserButton />
    </div>
  );
}
