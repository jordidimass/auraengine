"use client";

import { useQuery } from "convex/react";
import { Loader2, Radar, Settings2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { analyzePath } from "@/lib/routes";

function platformLabel(platform: "x" | "linkedin") {
  return platform === "x" ? "X (Twitter)" : "LinkedIn";
}

export default function PreferencesPage() {
  const params = useParams<{ brandId: string }>();
  const brandId = params.brandId as Id<"brands">;

  const brand = useQuery(api.brands.getById, { brandId });
  const preferences = useQuery(api.preferences.getByBrand, { brandId });

  if (brand === undefined || preferences === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (brand === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-zinc-300">
        <p>Marca no encontrada o sin acceso.</p>
        <Link href="/" className="text-fuchsia-300 hover:underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.08),_transparent_60%)] text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-10">
        <div className="flex items-center gap-2">
          <Radar className="text-fuchsia-400" size={22} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Vista 1 · Preferencias
            </h1>
            <p className="text-xs text-zinc-500">{brand.name}</p>
          </div>
        </div>
        <Link
          href={analyzePath(brandId)}
          className="text-xs uppercase tracking-widest text-zinc-500 transition hover:text-fuchsia-300"
        >
          Ir a Análisis
        </Link>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-24">
        {preferences.length === 0 ? (
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 text-sm text-zinc-400">
            No hay preferencias configuradas para esta marca todavía.
          </section>
        ) : (
          preferences.map((preference) => (
            <section
              key={preference._id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-fuchsia-400" />
                  <h2 className="font-medium">
                    {platformLabel(preference.platform)}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${
                    preference.enabled
                      ? "bg-fuchsia-500/10 text-fuchsia-200"
                      : "bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {preference.enabled ? "Activo" : "Off"}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Tono</dt>
                  <dd className="mt-1 capitalize text-zinc-200">
                    {preference.tone}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Riesgo default</dt>
                  <dd className="mt-1 font-mono text-zinc-200">
                    {preference.defaultRiskLevel}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Max length</dt>
                  <dd className="mt-1 font-mono text-zinc-200">
                    {preference.maxLength}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Emojis / hashtags</dt>
                  <dd className="mt-1 text-zinc-200">
                    {preference.useEmojis ? "Emojis" : "Sin emojis"} ·{" "}
                    {preference.useHashtags ? "Hashtags" : "Sin hashtags"}
                  </dd>
                </div>
              </dl>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
