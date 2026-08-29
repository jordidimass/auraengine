"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { CreateBrandForm } from "@/components/brands/CreateBrandForm";
import { analyzePath, preferencesPath } from "@/lib/routes";
import { api } from "../../../convex/_generated/api";

export function BrandList() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const brands = useQuery(api.brands.listMine, isAuthenticated ? {} : "skip");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-8 sm:px-6 sm:py-12">
      <div>
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
          Your brands
        </p>
        <h1 className="mt-3 text-xl leading-snug tracking-tight sm:text-2xl">
          Pick a brand to open the reply desk.
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading brands…
        </div>
      ) : !isAuthenticated ? (
        <p className="text-sm text-muted-foreground">
          Clerk signed you in, but it has no JWT named <code>convex</code>, so
          Convex cannot verify the session. In Clerk: JWT Templates → New
          template → Convex (the name must be <code>convex</code>), or activate
          the Convex integration. Then sign out and back in.
        </p>
      ) : brands === undefined ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading brands…
        </div>
      ) : brands.length === 0 ? (
        <CreateBrandForm />
      ) : (
        <>
          <ul className="grid gap-0 border border-border sm:grid-cols-2">
            {brands.map((brand) => (
              <li
                key={brand._id}
                className="flex flex-col gap-3 border-border p-4 sm:border-r sm:even:border-r-0 max-sm:border-b max-sm:last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium">{brand.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {brand.description}
                  </p>
                </div>
                <div className="mt-auto flex gap-2">
                  <Link
                    href={preferencesPath(brand._id)}
                    className="text-xs uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
                  >
                    Preferences
                  </Link>
                  <Link
                    href={analyzePath(brand._id)}
                    className="text-xs uppercase tracking-widest text-primary transition hover:opacity-80"
                  >
                    Analyze
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <CreateBrandForm />
        </>
      )}
    </main>
  );
}
