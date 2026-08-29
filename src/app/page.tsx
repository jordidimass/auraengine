"use client";

import { useQuery } from "convex/react";
import { Loader2, Radar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuraCounter } from "@/components/AuraCounter";
import { PostCard, type CompetitorSteal } from "@/components/PostCard";
import { analyzePath, preferencesPath } from "@/lib/routes";
import { api } from "../../convex/_generated/api";

const MOCK_FEED: CompetitorSteal[] = [
  {
    id: "1",
    competitorName: "rivalstartup",
    originalContent:
      "Our new dashboard redesign is finally live. Took us 6 months but worth it!",
    targetWeakness:
      "Replies are pointing out the redesign removed dark mode and broke keyboard shortcuts.",
    generatedResponse:
      "6 months for a redesign that ships without dark mode? We shipped ours with day-one shortcut support.",
    auraOpportunityScore: 82,
    projectedAuraGain: 4200,
    status: "ready",
  },
  {
    id: "2",
    competitorName: "growthbro",
    originalContent:
      "Hot take: AI agents are overhyped and will plateau in 2026.",
    targetWeakness:
      "No data cited, thread is getting ratio'd by builders shipping agent products daily.",
    generatedResponse:
      "Plateau? We shipped 3 agent releases this quarter. Overhyped things don't ship, they get talked about.",
    auraOpportunityScore: 67,
    projectedAuraGain: 2100,
    status: "detected",
  },
];

export default function Home() {
  const brands = useQuery(api.brands.listMine);
  const [feed, setFeed] = useState(MOCK_FEED);

  const totalAura = feed
    .filter((post) => post.status === "stolen")
    .reduce((sum, post) => sum + post.projectedAuraGain, 0);

  function stealAura(id: string) {
    setFeed((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, status: "stolen" } : post,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.08),_transparent_60%)] text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-10">
        <div className="flex items-center gap-2">
          <Radar className="text-fuchsia-400" size={22} />
          <h1 className="text-xl font-bold tracking-tight">AuraEngine</h1>
        </div>
        <AuraCounter value={totalAura} />
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-24">
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
          <h2 className="text-sm uppercase tracking-[0.25em] text-fuchsia-400/70">
            Tus marcas
          </h2>
          {brands === undefined ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Cargando marcas…
            </div>
          ) : brands.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Inicia sesión y crea una marca en Convex para abrir Vista 1–3.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {brands.map((brand) => (
                <li
                  key={brand._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-100">{brand.name}</p>
                    <p className="text-xs text-zinc-500">{brand.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={preferencesPath(brand._id)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-widest text-zinc-400 transition hover:border-fuchsia-500/40 hover:text-fuchsia-200"
                    >
                      Preferencias
                    </Link>
                    <Link
                      href={analyzePath(brand._id)}
                      className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs uppercase tracking-widest text-fuchsia-200 transition hover:bg-fuchsia-500/30"
                    >
                      Analizar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            Demo feed (local mock)
          </p>
          {feed.map((post) => (
            <PostCard key={post.id} post={post} onSteal={stealAura} />
          ))}
        </section>
      </main>
    </div>
  );
}
