"use client";

import { RiskSlider } from "@/components/RiskSlider";
import { useAction, useQuery } from "convex/react";
import { AlertCircle, ArrowRight, Loader2, Radar, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Platform = "x" | "linkedin";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado al analizar el post.";
}

export default function AnalyzePage() {
  const params = useParams<{ brandId: string }>();
  const router = useRouter();
  const brandId = params.brandId as Id<"brands">;

  const brand = useQuery(api.brands.getById, { brandId });
  const analyzeUrl = useAction(api.analysis.analyzeUrl);

  const [url, setUrl] = useState("");
  const [userContext, setUserContext] = useState("");
  const [targetPlatform, setTargetPlatform] = useState<Platform>("x");
  const [riskOverride, setRiskOverride] = useState<number | null>(null);
  const [activePostId, setActivePostId] = useState<Id<"competitor_posts"> | null>(
    null,
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultRiskLevel = useMemo(() => {
    if (brand === undefined || brand === null) {
      return 50;
    }
    return (
      brand.preferences.find((item) => item.platform === targetPlatform)
        ?.defaultRiskLevel ?? 50
    );
  }, [brand, targetPlatform]);

  const riskLevel = riskOverride ?? defaultRiskLevel;

  const analysis = useQuery(
    api.analysis.getPost,
    activePostId ? { postId: activePostId } : "skip",
  );

  const postStatus = analysis?.post.status;
  const isProcessing =
    isSubmitting || postStatus === "scraping" || postStatus === "analyzing";
  const isReady = postStatus === "ready" && analysis?.steal !== null;
  const isFailed = postStatus === "failed";

  async function handleAnalyze() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setRequestError("Pega la URL del post competidor antes de analizar.");
      return;
    }

    setRequestError(null);
    setIsSubmitting(true);

    try {
      const result = await analyzeUrl({
        brandId,
        url: trimmedUrl,
        riskLevel,
        targetPlatform,
        userContext: userContext.trim() || undefined,
      });
      setActivePostId(result.postId);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleApprove() {
    if (!analysis?.steal) {
      return;
    }
    router.push(`/brands/${brandId}/compose/${analysis.steal._id}`);
  }

  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.08),_transparent_60%)] text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-10">
        <div className="flex items-center gap-2">
          <Radar className="text-fuchsia-400" size={22} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Vista 2 · Análisis</h1>
            <p className="text-xs text-zinc-500">
              {brand === undefined
                ? "Cargando marca…"
                : brand === null
                  ? "Marca no encontrada"
                  : brand.name}
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-zinc-500 transition hover:text-fuchsia-300"
        >
          Dashboard
        </Link>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-24">
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-[0_0_40px_rgba(217,70,239,0.06)]">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.25em] text-fuchsia-400/70">
              URL del post competidor
            </span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/competidor/status/123…"
              disabled={isProcessing}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-fuchsia-500/60 disabled:opacity-60"
            />
          </label>

          <div className="mt-5 flex gap-2">
            {(["x", "linkedin"] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setTargetPlatform(platform);
                  setRiskOverride(null);
                }}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
                  targetPlatform === platform
                    ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {platform === "x" ? "X" : "LinkedIn"}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <RiskSlider
              value={riskLevel}
              onChange={setRiskOverride}
              disabled={isProcessing}
            />
          </div>

          <label className="mt-6 block space-y-2">
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Contexto opcional
            </span>
            <input
              type="text"
              value={userContext}
              onChange={(event) => setUserContext(event.target.value)}
              placeholder="Una línea de contexto para el análisis…"
              disabled={isProcessing}
              className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-fuchsia-500/60 disabled:opacity-60"
            />
          </label>

          {requestError ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{requestError}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isProcessing || brand === null}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analizando post…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Analizar Post
              </>
            )}
          </button>
        </section>

        {isProcessing && analysis?.post ? (
          <section className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-6">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-fuchsia-300" />
              <div>
                <p className="font-medium text-fuchsia-100">
                  {postStatus === "scraping"
                    ? "Recopilando contenido del post…"
                    : "Generando contranarrativa con Aura Score…"}
                </p>
                <p className="text-sm text-zinc-400">
                  Estado en tiempo real vía Convex
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {isFailed && analysis?.post ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <div className="flex items-start gap-2 text-red-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">El análisis falló</p>
                <p className="mt-1 text-sm">
                  {analysis.post.error ?? "No se pudo completar el pipeline."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {isReady && analysis?.steal ? (
          <section className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-400/70">
                  Aura Opportunity Score
                </p>
                <p className="font-mono text-4xl font-bold text-fuchsia-300">
                  {analysis.steal.auraOpportunityScore}
                  <span className="text-lg text-zinc-500">/100</span>
                </p>
              </div>
              <div className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-xs uppercase tracking-widest text-fuchsia-200">
                Riesgo {analysis.steal.riskLevel}
              </div>
            </div>

            <article className="rounded-xl border border-zinc-800 bg-black/60 p-4">
              <h2 className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Debilidad detectada
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                {analysis.steal.targetWeakness}
              </p>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-black/60 p-4">
              <h2 className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Contranarrativa (borrador)
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                {analysis.steal.generatedResponse}
              </p>
            </article>

            <button
              type="button"
              onClick={handleApprove}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-400/40 bg-transparent px-5 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/10"
            >
              Aprobar y Componer
              <ArrowRight size={16} />
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
