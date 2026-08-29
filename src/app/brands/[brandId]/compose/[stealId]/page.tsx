"use client";

import { RiskSlider } from "@/components/RiskSlider";
import { projectedAuraGain } from "@/lib/aura";
import { analyzePath, isBrandDocumentId, preferencesPath } from "@/lib/routes";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Film,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type Platform = "x" | "linkedin";

interface ComposeSuccessState {
  auraDelta: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

function platformIntentUrl(platform: Platform, text: string): string {
  const encoded = encodeURIComponent(text);
  if (platform === "x") {
    return `https://twitter.com/intent/tweet?text=${encoded}`;
  }
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
}

function platformLabel(platform: Platform): string {
  return platform === "x" ? "X (Twitter)" : "LinkedIn";
}

function SocialPreviewCard({
  platform,
  brandName,
  logoUrl,
  copyText,
  imageUrl,
  audioUrl,
  videoUrl,
  isGeneratingImage,
  isGeneratingVideo,
}: {
  platform: Platform;
  brandName: string;
  logoUrl?: string;
  copyText: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
}) {
  const handle = `@${brandName.toLowerCase().replace(/\s+/g, "")}`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-zinc-950/80 ${
        platform === "x"
          ? "border-zinc-800"
          : "border-[#0a66c2]/30 shadow-[0_0_30px_rgba(10,102,194,0.08)]"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={brandName}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-fuchsia-500/30"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-200">
            {brandName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-zinc-100">{brandName}</p>
          <p className="text-xs text-zinc-500">{handle}</p>
        </div>
        <span className="ml-auto rounded-full bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-500">
          Preview
        </span>
      </div>

      <div className="space-y-4 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
          {copyText || "Tu copy aparecerá aquí…"}
        </p>

        {isGeneratingImage ? (
          <div className="aspect-[1200/630] animate-pulse rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-fuchsia-950/40">
            <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Generando imagen con fal.ai…
            </div>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Visual generado"
            className="aspect-[1200/630] w-full rounded-xl border border-zinc-800 object-cover"
          />
        ) : (
          <div className="flex aspect-[1200/630] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-black/40 text-sm text-zinc-600">
            Sin imagen — pulsa &quot;Generar / Regenerar Imagen&quot;
          </div>
        )}

        {isGeneratingVideo ? (
          <div className="aspect-[9/16] max-h-80 animate-pulse rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-fuchsia-950/40">
            <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Generando video con fal.ai…
            </div>
          </div>
        ) : videoUrl ? (
          <video
            controls
            src={videoUrl}
            className="max-h-80 w-full rounded-xl border border-zinc-800 bg-black object-contain"
          />
        ) : null}

        {audioUrl ? (
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Volume2 size={14} />
              Voiceover ElevenLabs
            </div>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ComposePage() {
  const params = useParams<{ brandId: string; stealId: string }>();
  const router = useRouter();
  const brandId = params.brandId as Id<"brands">;
  const stealId = params.stealId as Id<"aura_steals">;

  const composeData = useQuery(api.analysis.getStealById, { stealId });
  const preferences = useQuery(
    api.preferences.getByBrand,
    isBrandDocumentId(params.brandId) ? { brandId: params.brandId } : "skip",
  );
  const assets = useQuery(api.assets.getAssets, { stealId });

  const regenerateCopy = useAction(api.analysis.regenerateCopy);
  const generateImage = useAction(api.assets.generateImage);
  const generateVideo = useAction(api.assets.generateVideo);
  const enqueuePublication = useMutation(api.publisher.enqueue);
  const saveEditedCopy = useMutation(api.analysis.updateEditedResponse);

  const [copyText, setCopyText] = useState("");
  const [riskLevel, setRiskLevel] = useState(50);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("x");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isRegeneratingCopy, setIsRegeneratingCopy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successState, setSuccessState] = useState<ComposeSuccessState | null>(
    null,
  );

  const lastGeneratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!composeData?.steal) {
      return;
    }

    const nextCopy =
      composeData.steal.editedResponse ?? composeData.steal.generatedResponse;

    if (lastGeneratedRef.current === null) {
      lastGeneratedRef.current = composeData.steal.generatedResponse;
      setCopyText(nextCopy);
      setRiskLevel(composeData.steal.riskLevel);
      setPreviewPlatform(composeData.steal.targetPlatform);
      return;
    }

    if (
      composeData.steal.generatedResponse !== lastGeneratedRef.current
    ) {
      lastGeneratedRef.current = composeData.steal.generatedResponse;
      setCopyText(nextCopy);
      setRiskLevel(composeData.steal.riskLevel);
    }
  }, [composeData?.steal]);

  const projectedGain =
    composeData?.steal !== undefined
      ? projectedAuraGain(composeData.steal.auraOpportunityScore)
      : 0;

  const assetGenerating = assets?.asset?.status === "generating";
  const activePreference =
    preferences === undefined
      ? undefined
      : preferences.find((item) => item.platform === previewPlatform);

  async function handleRegenerateCopy() {
    setRequestError(null);
    setIsRegeneratingCopy(true);
    try {
      await regenerateCopy({ stealId, riskLevel });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsRegeneratingCopy(false);
    }
  }

  async function handleGenerateImage() {
    setRequestError(null);
    setIsGeneratingImage(true);
    try {
      await generateImage({ stealId });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleGenerateVideo() {
    setRequestError(null);
    setIsGeneratingVideo(true);
    try {
      await generateVideo({
        stealId,
        duration: 5,
        aspectRatio: previewPlatform === "linkedin" ? "16:9" : "9:16",
      });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  async function handlePublish() {
    if (!copyText.trim()) {
      setRequestError("El copy no puede estar vacío.");
      return;
    }

    setRequestError(null);
    setIsPublishing(true);

    try {
      await saveEditedCopy({ stealId, editedResponse: copyText.trim() });
      const result = await enqueuePublication({
        stealId,
        platform: previewPlatform,
        finalText: copyText.trim(),
      });
      setSuccessState({ auraDelta: result.auraDelta });
      window.setTimeout(() => {
        router.push(analyzePath(brandId));
      }, 2600);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  }

  function handleCopyAndOpen() {
    if (!copyText.trim()) {
      setRequestError("El copy no puede estar vacío.");
      return;
    }

    void navigator.clipboard.writeText(copyText.trim());
    window.open(platformIntentUrl(previewPlatform, copyText.trim()), "_blank");
  }

  if (composeData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (composeData === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-300">
        <p>Steal no encontrado o sin acceso.</p>
        <Link
          href={analyzePath(brandId)}
          className="text-fuchsia-300 hover:underline"
        >
          Volver al análisis
        </Link>
      </div>
    );
  }

  const { steal, brand, post } = composeData;

  return (
    <div className="relative min-h-screen bg-black bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.08),_transparent_60%)] text-zinc-100">
      {successState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-fuchsia-400/40 bg-zinc-950 p-8 text-center shadow-[0_0_60px_rgba(217,70,239,0.25)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-500/20">
              <Zap className="text-fuchsia-300" size={28} />
            </div>
            <h2 className="text-xl font-bold text-fuchsia-100">
              ¡Aura robada exitosamente!
            </h2>
            <p className="mt-2 text-3xl font-bold text-fuchsia-300">
              +{successState.auraDelta.toLocaleString("es-MX")} Puntos
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              agregados al Ledger de {brand.name}
            </p>
          </div>
        </div>
      ) : null}

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <div className="flex items-center gap-4">
          <Link
            href={analyzePath(brandId)}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-fuchsia-300"
          >
            <ArrowLeft size={16} />
            Volver a Análisis
          </Link>
          <Link
            href={preferencesPath(brandId)}
            className="text-xs uppercase tracking-widest text-zinc-500 transition hover:text-fuchsia-300"
          >
            Preferencias
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Vista 3 · Composición
            </h1>
            <p className="text-xs text-zinc-500">
              vs @{post.authorHandle} · {brand.name}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
          </span>
          <span className="font-mono text-sm font-semibold text-fuchsia-200">
            ⚡ +{projectedGain.toLocaleString("es-MX")} AURA
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-32 lg:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-400/70">
              Copy & Riesgo
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Ajusta el texto antes de publicar. Score actual:{" "}
              {steal.auraOpportunityScore}/100
            </p>
          </div>

          <textarea
            value={copyText}
            onChange={(event) => setCopyText(event.target.value)}
            rows={12}
            disabled={isRegeneratingCopy || isPublishing}
            className="w-full resize-y rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm leading-relaxed text-zinc-100 outline-none transition focus:border-fuchsia-500/60 disabled:opacity-60"
            placeholder="Contranarrativa generada…"
          />

          <RiskSlider
            value={riskLevel}
            onChange={setRiskLevel}
            disabled={isRegeneratingCopy || isPublishing}
          />

          {activePreference ? (
            <p className="text-xs text-zinc-600">
              Preferencia {platformLabel(previewPlatform)}: tono{" "}
              {activePreference.tone}, máx. {activePreference.maxLength}{" "}
              caracteres
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRegenerateCopy}
              disabled={isRegeneratingCopy || isPublishing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40 hover:text-fuchsia-200 disabled:opacity-50"
            >
              {isRegeneratingCopy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Regenerar Copy
            </button>

            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={
                isGeneratingImage ||
                isGeneratingVideo ||
                assetGenerating ||
                isPublishing
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40 hover:text-fuchsia-200 disabled:opacity-50"
            >
              {isGeneratingImage || assetGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImageIcon size={16} />
              )}
              Generar / Regenerar Imagen
            </button>

            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={
                isGeneratingImage ||
                isGeneratingVideo ||
                assetGenerating ||
                isPublishing
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-500/40 hover:text-fuchsia-200 disabled:opacity-50"
            >
              {isGeneratingVideo || assetGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Film size={16} />
              )}
              Generar video 5s
            </button>
          </div>

          {assets?.asset?.status === "failed" ? (
            <p className="text-sm text-red-300">
              La generación de imagen o video falló. Intenta regenerar.
            </p>
          ) : null}

          {requestError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {requestError}
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex gap-2">
            {(["x", "linkedin"] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setPreviewPlatform(platform)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition ${
                  previewPlatform === platform
                    ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {platform === "x" ? "X (Twitter)" : "LinkedIn"}
              </button>
            ))}
          </div>

          <SocialPreviewCard
            platform={previewPlatform}
            brandName={brand.name}
            logoUrl={brand.logoUrl}
            copyText={copyText}
            imageUrl={assets?.imageUrl ?? null}
            audioUrl={assets?.audioUrl ?? null}
            videoUrl={assets?.videoUrl ?? null}
            isGeneratingImage={Boolean(isGeneratingImage || assetGenerating)}
            isGeneratingVideo={Boolean(isGeneratingVideo || assetGenerating)}
          />

          <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-sm text-zinc-400">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Debilidad detectada
            </p>
            <p className="mt-2 leading-relaxed text-zinc-300">
              {steal.targetWeakness}
            </p>
          </article>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-zinc-800/80 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isRegeneratingCopy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            ⚡ Steal Aura & Publish
          </button>

          <button
            type="button"
            onClick={handleCopyAndOpen}
            disabled={isPublishing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/40 hover:text-fuchsia-200 disabled:opacity-50"
          >
            <Copy size={16} />
            Copiar Copy y Abrir Red
            <ExternalLink size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
