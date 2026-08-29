"use client";

import { BrandHeader } from "@/components/brands/BrandHeader";
import { PlatformToggle } from "@/components/brands/PlatformToggle";
import { RiskSlider } from "@/components/RiskSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Platform } from "@/lib/platforms";
import { composePath, isBrandDocumentId } from "@/lib/routes";
import { useAction, useQuery } from "convex/react";
import { AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado al analizar el post.";
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function AnalyzePage() {
  const params = useParams<{ brandId: string }>();
  const router = useRouter();
  const rawBrandId = params.brandId;
  const brandId = isBrandDocumentId(rawBrandId) ? rawBrandId : null;

  const brand = useQuery(
    api.brands.getById,
    brandId ? { brandId } : "skip",
  );
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

  if (!brandId) {
    return (
      <CenteredMessage>
        <AlertCircle className="text-destructive" size={28} />
        <p>Marca no encontrada o sin acceso.</p>
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </CenteredMessage>
    );
  }

  async function handleAnalyze() {
    if (!brandId) {
      return;
    }
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
    if (!brandId || !analysis?.steal) {
      return;
    }
    router.push(composePath(brandId, analysis.steal._id));
  }

  if (brand === undefined) {
    return (
      <CenteredMessage>
        <Loader2 className="animate-spin" size={24} />
      </CenteredMessage>
    );
  }

  if (brand === null) {
    return (
      <CenteredMessage>
        <AlertCircle className="text-destructive" size={28} />
        <p>Marca no encontrada o sin acceso.</p>
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <div className="min-h-dvh">
      <BrandHeader brandId={brandId} brandName={brand.name} title="Analyze" />

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-3 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 border border-border p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.16em] text-muted-foreground">
              URL del post competidor
            </span>
            <Input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/competidor/status/123…"
              disabled={isProcessing}
            />
          </label>

          <PlatformToggle
            value={targetPlatform}
            disabled={isProcessing}
            onChange={(platform) => {
              setTargetPlatform(platform);
              setRiskOverride(null);
            }}
          />

          <RiskSlider
            value={riskLevel}
            onChange={setRiskOverride}
            disabled={isProcessing}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.16em] text-muted-foreground">
              Contexto opcional
            </span>
            <Input
              type="text"
              value={userContext}
              onChange={(event) => setUserContext(event.target.value)}
              placeholder="Una línea de contexto para el análisis…"
              disabled={isProcessing}
            />
          </label>

          {requestError ? (
            <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{requestError}</span>
            </div>
          ) : null}

          <Button onClick={handleAnalyze} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" />
                Analizando post…
              </>
            ) : (
              <>
                <Sparkles />
                Analizar Post
              </>
            )}
          </Button>
        </div>

        {isProcessing && analysis?.post ? (
          <div className="flex items-center gap-3 border border-primary/30 bg-primary/5 p-4">
            <Loader2 size={18} className="animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">
                {postStatus === "scraping"
                  ? "Recopilando contenido del post…"
                  : "Generando contranarrativa con Aura Score…"}
              </p>
              <p className="text-xs text-muted-foreground">
                Estado en tiempo real vía Convex
              </p>
            </div>
          </div>
        ) : null}

        {isFailed && analysis?.post ? (
          <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">El análisis falló</p>
              <p className="mt-1 text-xs">
                {analysis.post.error ?? "No se pudo completar el pipeline."}
              </p>
            </div>
          </div>
        ) : null}

        {isReady && analysis?.steal ? (
          <div className="flex flex-col gap-4 border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
                  Aura Opportunity Score
                </p>
                <p className="font-mono text-3xl font-medium text-primary">
                  {analysis.steal.auraOpportunityScore}
                  <span className="text-base text-muted-foreground">/100</span>
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Riesgo {analysis.steal.riskLevel}
              </span>
            </div>

            <article className="border border-border p-3">
              <h2 className="text-[11px] tracking-[0.16em] text-muted-foreground">
                Debilidad detectada
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                {analysis.steal.targetWeakness}
              </p>
            </article>

            <article className="border border-border p-3">
              <h2 className="text-[11px] tracking-[0.16em] text-muted-foreground">
                Contranarrativa (borrador)
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                {analysis.steal.generatedResponse}
              </p>
            </article>

            <Button variant="outline" onClick={handleApprove}>
              Aprobar y Componer
              <ArrowRight />
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
