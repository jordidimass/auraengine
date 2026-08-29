"use client";

import { BrandHeader } from "@/components/brands/BrandHeader";
import { PlatformToggle } from "@/components/brands/PlatformToggle";
import { RiskSlider } from "@/components/RiskSlider";
import { Button } from "@/components/ui/button";
import { projectedAuraGain } from "@/lib/aura";
import { platformLabel, type Platform } from "@/lib/platforms";
import { analyzePath, isBrandDocumentId, isStealDocumentId } from "@/lib/routes";
import { useAction, useMutation, useQuery, useConvexAuth } from "convex/react";
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
import { api, type Id } from "@/lib/convex";

interface ComposeSuccessState {
  auraDelta: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

function platformIntentUrl(platform: Platform, text: string): string | null {
  const encoded = encodeURIComponent(text);
  if (platform === "x") {
    return `https://twitter.com/intent/tweet?text=${encoded}`;
  }
  if (platform === "linkedin") {
    return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
  }
  // Instagram has no web share-intent URL — copy the text and open the app.
  return null;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function SocialPreviewCard({
  brandName,
  logoUrl,
  copyText,
  imageUrl,
  audioUrl,
  videoUrl,
  isGeneratingImage,
  isGeneratingVideo,
}: {
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
    <div className="overflow-hidden border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={brandName}
            className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/30"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {brandName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{brandName}</p>
          <p className="text-xs text-muted-foreground">{handle}</p>
        </div>
        <span className="ml-auto rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="space-y-4 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {copyText || "Tu copy aparecerá aquí…"}
        </p>

        {isGeneratingImage ? (
          <div className="flex aspect-[1200/630] animate-pulse items-center justify-center border border-border bg-muted/40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Generando imagen con fal.ai…
            </div>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Visual generado"
            className="aspect-[1200/630] w-full border border-border object-cover"
          />
        ) : (
          <div className="flex aspect-[1200/630] items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
            Sin imagen — pulsa &quot;Generar / Regenerar Imagen&quot;
          </div>
        )}

        {isGeneratingVideo ? (
          <div className="flex aspect-[9/16] max-h-80 animate-pulse items-center justify-center border border-border bg-muted/40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Generando video con fal.ai…
            </div>
          </div>
        ) : videoUrl ? (
          <video
            controls
            src={videoUrl}
            className="max-h-80 w-full border border-border bg-background object-contain"
          />
        ) : null}

        {audioUrl ? (
          <div className="border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
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
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const brandId = isBrandDocumentId(params.brandId) ? params.brandId : null;
  const stealId = isStealDocumentId(params.stealId) ? params.stealId : null;
  const canQuery = isAuthenticated && stealId !== null;

  const composeData = useQuery(
    api.analysis.getStealById,
    canQuery ? { stealId } : "skip",
  );
  const preferences = useQuery(
    api.preferences.getByBrand,
    isAuthenticated && brandId ? { brandId } : "skip",
  );
  const assets = useQuery(
    api.assets.getAssets,
    canQuery ? { stealId } : "skip",
  );

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

  const imageBusy = isGeneratingImage;
  const videoBusy = isGeneratingVideo;
  const activePreference =
    preferences === undefined
      ? undefined
      : preferences.find((item) => item.platform === previewPlatform);

  async function handleRegenerateCopy() {
    if (stealId === null) {
      return;
    }
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
    if (stealId === null) {
      return;
    }
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
    if (stealId === null) {
      return;
    }
    setRequestError(null);
    setIsGeneratingVideo(true);
    try {
      await generateVideo({
        stealId,
        duration: 6,
        aspectRatio: previewPlatform === "linkedin" ? "16:9" : "9:16",
      });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  async function handlePublish() {
    if (!copyText.trim() || stealId === null || brandId === null) {
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
    const intentUrl = platformIntentUrl(previewPlatform, copyText.trim());
    if (intentUrl) {
      window.open(intentUrl, "_blank");
    } else {
      window.open("https://www.instagram.com/", "_blank");
    }
  }

  if (isAuthLoading || (canQuery && composeData === undefined)) {
    return (
      <CenteredMessage>
        <Loader2 className="animate-spin" size={24} />
      </CenteredMessage>
    );
  }

  if (
    brandId === null ||
    stealId === null ||
    composeData === null ||
    composeData === undefined ||
    !isAuthenticated
  ) {
    return (
      <CenteredMessage>
        <p>Steal no encontrado o sin acceso.</p>
        <Link
          href={brandId ? analyzePath(brandId) : "/"}
          className="text-primary hover:underline"
        >
          Volver al análisis
        </Link>
      </CenteredMessage>
    );
  }

  const { steal, brand, post } = composeData;

  return (
    <div className="relative min-h-dvh">
      {successState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md border border-primary/40 bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Zap className="text-primary" size={28} />
            </div>
            <h2 className="text-lg font-medium">¡Aura robada exitosamente!</h2>
            <p className="mt-2 text-3xl font-medium text-primary">
              +{successState.auraDelta.toLocaleString("es-MX")} Puntos
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              agregados al Ledger de {brand.name}
            </p>
          </div>
        </div>
      ) : null}

      <BrandHeader
        brandId={brandId}
        brandName={brand.name}
        title={`Compose · vs @${post.authorHandle}`}
        extra={
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-xs font-medium text-primary">
              +{projectedGain.toLocaleString("es-MX")} AURA
            </span>
          </span>
        }
      />

      <div className="border-b border-border px-3 py-2 sm:px-4">
        <Link
          href={analyzePath(brandId)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver a Análisis
        </Link>
      </div>

      <main className="mx-auto grid max-w-5xl gap-4 px-3 py-8 pb-32 sm:px-6 sm:py-12 sm:pb-32 lg:grid-cols-2">
        <section className="flex flex-col gap-4 border border-border p-4">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
              Copy & Riesgo
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajusta el texto antes de publicar. Score actual:{" "}
              {steal.auraOpportunityScore}/100
            </p>
          </div>

          <textarea
            value={copyText}
            onChange={(event) => setCopyText(event.target.value)}
            rows={12}
            disabled={isRegeneratingCopy || isPublishing}
            className="w-full resize-y border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            placeholder="Contranarrativa generada…"
          />

          <RiskSlider
            value={riskLevel}
            onChange={setRiskLevel}
            disabled={isRegeneratingCopy || isPublishing}
          />

          {activePreference ? (
            <p className="text-xs text-muted-foreground">
              Preferencia {platformLabel(previewPlatform)}: tono{" "}
              {activePreference.tone}, máx. {activePreference.maxLength}{" "}
              caracteres
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRegenerateCopy}
              disabled={isRegeneratingCopy || isPublishing}
            >
              {isRegeneratingCopy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Regenerar Copy
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGenerateImage}
              disabled={imageBusy || isPublishing}
            >
              {imageBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ImageIcon />
              )}
              Generar / Regenerar Imagen
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGenerateVideo}
              disabled={videoBusy || isPublishing}
            >
              {videoBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Film />
              )}
              Generar video 6s
            </Button>
          </div>

          {assets?.asset?.status === "failed" ? (
            <p className="text-sm text-destructive">
              La generación de imagen o video falló. Intenta regenerar.
            </p>
          ) : null}

          {requestError ? (
            <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {requestError}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <PlatformToggle value={previewPlatform} onChange={setPreviewPlatform} />

          <SocialPreviewCard
            brandName={brand.name}
            logoUrl={brand.logoUrl}
            copyText={copyText}
            imageUrl={assets?.imageUrl ?? null}
            audioUrl={assets?.audioUrl ?? null}
            videoUrl={assets?.videoUrl ?? null}
            isGeneratingImage={imageBusy}
            isGeneratingVideo={videoBusy}
          />

          <article className="border border-border p-3 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-widest">
              Debilidad detectada
            </p>
            <p className="mt-2 leading-relaxed">{steal.targetWeakness}</p>
          </article>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-4 sm:flex-row sm:px-6">
          <Button
            className="flex-1"
            onClick={handlePublish}
            disabled={isPublishing || isRegeneratingCopy}
          >
            {isPublishing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Steal Aura & Publish
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyAndOpen}
            disabled={isPublishing}
          >
            <Copy />
            Copiar Copy y Abrir Red
            <ExternalLink />
          </Button>
        </div>
      </footer>
    </div>
  );
}
