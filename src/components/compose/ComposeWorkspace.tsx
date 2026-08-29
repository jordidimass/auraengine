"use client";

import { projectedAuraGain } from "@/lib/aura";
import { analyzePath, preferencesPath } from "@/lib/routes";
import { RiskSlider } from "@/components/RiskSlider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Volume2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Platform = "x" | "linkedin";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function platformIntentUrl(platform: Platform, text: string): string {
  const encoded = encodeURIComponent(text);
  return platform === "x"
    ? `https://twitter.com/intent/tweet?text=${encoded}`
    : `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
}

export function ComposeWorkspace({
  brandId,
  stealId,
}: {
  brandId: string;
  stealId: string;
}) {
  const router = useRouter();
  const typedBrandId = brandId as Id<"brands">;
  const typedStealId = stealId as Id<"aura_steals">;
  const composeData = useQuery(api.analysis.getStealById, { stealId: typedStealId });
  const preferences = useQuery(api.preferences.getByBrand, { brandId: typedBrandId });
  const assets = useQuery(api.assets.getAssets, { stealId: typedStealId });

  const regenerateCopy = useAction(api.analysis.regenerateCopy);
  const generateImage = useAction(api.assets.generateImage);
  const enqueuePublication = useMutation(api.publisher.enqueue);
  const saveEditedCopy = useMutation(api.analysis.updateEditedResponse);

  const [copyText, setCopyText] = useState("");
  const [riskLevel, setRiskLevel] = useState(50);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("x");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isRegeneratingCopy, setIsRegeneratingCopy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successAura, setSuccessAura] = useState<number | null>(null);
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
    if (composeData.steal.generatedResponse !== lastGeneratedRef.current) {
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

  if (composeData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (composeData === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
        <p>Steal not found or access denied.</p>
        <Button asChild variant="outline">
          <Link href={analyzePath(typedBrandId)}>Back to Analyze</Link>
        </Button>
      </div>
    );
  }

  const { steal, brand, post } = composeData;

  async function handleRegenerateCopy() {
    setRequestError(null);
    setIsRegeneratingCopy(true);
    try {
      await regenerateCopy({ stealId: typedStealId, riskLevel });
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
      await generateImage({ stealId: typedStealId });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handlePublish() {
    if (!copyText.trim()) {
      setRequestError("Copy cannot be empty.");
      return;
    }
    setRequestError(null);
    setIsPublishing(true);
    try {
      await saveEditedCopy({ stealId: typedStealId, editedResponse: copyText.trim() });
      await enqueuePublication({
        stealId: typedStealId,
        platform: previewPlatform,
        finalText: copyText.trim(),
      });
      setSuccessAura(projectedGain);
      window.setTimeout(() => router.push(analyzePath(typedBrandId)), 2600);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {successAura !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <Zap className="mx-auto text-primary" size={28} />
              <CardTitle>Aura stolen successfully</CardTitle>
              <CardDescription>
                +{successAura.toLocaleString()} points added to {brand.name}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Link href={analyzePath(typedBrandId)} className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft size={14} /> Analyze
            </Link>
            <Link href={preferencesPath(typedBrandId)} className="hover:text-foreground">
              Preferences
            </Link>
          </div>
          <h1 className="text-3xl tracking-tight sm:text-4xl">Compose</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            vs @{post.authorHandle} · {brand.name}
          </p>
        </div>
        <div className="rounded-full border px-4 py-2 font-mono text-sm">
          +{projectedGain.toLocaleString()} AURA
        </div>
      </div>

      <div className="grid flex-1 gap-6 pb-12 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Copy & risk</CardTitle>
            <CardDescription>
              Score {steal.auraOpportunityScore}/100 — edit before publishing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={copyText}
              onChange={(event) => setCopyText(event.target.value)}
              rows={12}
              disabled={isRegeneratingCopy || isPublishing}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <RiskSlider value={riskLevel} onChange={setRiskLevel} />
            <div className="flex gap-2">
              {(["x", "linkedin"] as const).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  size="sm"
                  variant={previewPlatform === platform ? "default" : "outline"}
                  onClick={() => setPreviewPlatform(platform)}
                >
                  {platform === "x" ? "X" : "LinkedIn"}
                </Button>
              ))}
            </div>
            {requestError ? (
              <p className="text-sm text-destructive">{requestError}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isRegeneratingCopy || isPublishing}
                onClick={handleRegenerateCopy}
              >
                {isRegeneratingCopy ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                Regenerate copy
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isGeneratingImage || assetGenerating || isPublishing}
                onClick={handleGenerateImage}
              >
                {isGeneratingImage || assetGenerating ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <ImageIcon data-icon="inline-start" />
                )}
                Generate image
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
              >
                {isPublishing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Zap data-icon="inline-start" />
                )}
                Publish / queue
              </Button>
              <Button type="button" variant="secondary" onClick={() => {
                void navigator.clipboard.writeText(copyText.trim());
                window.open(platformIntentUrl(previewPlatform, copyText.trim()), "_blank");
              }}>
                <Copy data-icon="inline-start" />
                Copy & open
                <ExternalLink data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>{previewPlatform === "x" ? "X" : "LinkedIn"} mockup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{copyText}</p>
            {isGeneratingImage || assetGenerating ? (
              <div className="flex aspect-[1200/630] items-center justify-center rounded-md border border-dashed">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : assets?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assets.imageUrl}
                alt="Generated visual"
                className="aspect-[1200/630] w-full rounded-md border object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/630] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No image yet
              </div>
            )}
            {assets?.audioUrl ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Volume2 size={14} /> Voiceover
                </Label>
                <audio controls src={assets.audioUrl} className="w-full" />
              </div>
            ) : null}
            {preferences?.find((p) => p.platform === previewPlatform) ? (
              <p className="text-xs text-muted-foreground">
                Tone: {preferences.find((p) => p.platform === previewPlatform)?.tone}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
