"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthControls } from "@/components/auth/AuthControls";
import { AsciiBanner } from "@/components/brand/AsciiBanner";
import { CreateBrandForm } from "@/components/brands/CreateBrandForm";
import { analyzePath, preferencesPath } from "@/lib/routes";
import { api } from "../../convex/_generated/api";

const STEPS = [
  {
    n: "01",
    title: "Paste the thread",
    body: "Drop a competitor URL. Aura pulls the post, metrics, and the replies that already smell weakness.",
  },
  {
    n: "02",
    title: "Set the risk",
    body: "Diplomatic to roast. One slider. The draft changes register, not just adjectives.",
  },
  {
    n: "03",
    title: "Send the counter",
    body: "Weakness, Aura score, and a reply you can send to Compose without rewriting the brief.",
  },
] as const;

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-dvh">
      <AsciiBanner />

      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground">
          Aura Engine
        </p>
        <AuthControls variant="nav" />
      </header>

      {isSignedIn ? <BrandList /> : <Hero />}
    </div>
  );
}

function Hero() {
  return (
    <main className="px-3 py-8 sm:px-6 sm:py-12">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both]">
        Competitor reply desk
      </p>
      <h1 className="mt-3 max-w-[22ch] text-xl leading-snug tracking-tight sm:text-2xl motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_40ms_both]">
        Steal the reply they left on the table.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_80ms_both]">
        Paste a competitor post. Aura reads the thread, scores the opening,
        and drafts the response at your risk level — diplomatic through roast.
      </p>

      <div className="mt-8 motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">
        <AuthControls variant="hero" />
      </div>

      <ol className="mt-12 grid gap-0 border border-border sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.n}
            className="border-border p-4 motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both] sm:border-r sm:last:border-r-0 max-sm:border-b max-sm:last:border-b-0"
            style={{ animationDelay: `${160 + index * 50}ms` }}
          >
            <span className="text-xs text-muted-foreground">{step.n}</span>
            <h2 className="mt-2 text-sm tracking-wide">{step.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}

function BrandList() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const brands = useQuery(
    api.brands.listMine,
    isAuthenticated ? {} : "skip",
  );

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
          Clerk signed you in, but it has no JWT named{" "}
          <code>convex</code>, so Convex cannot verify the session. In Clerk:
          JWT Templates → New template → Convex (the name must be{" "}
          <code>convex</code>), or activate the Convex integration. Then sign
          out and back in.
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
