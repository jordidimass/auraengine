"use client";

import { AnalyzeEmptyState } from "@/components/analyze/AnalyzeEmptyState";
import { RiskSlider } from "@/components/RiskSlider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { composePath } from "@/lib/routes";
import { useAction, useQuery } from "convex/react";
import { AlertCircle, ArrowRight, Loader2, Radar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Platform = "x" | "linkedin";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error while analyzing the post.";
}

export function AnalyzeWorkspace({ brandId }: { brandId: string }) {
  const router = useRouter();
  const typedBrandId = brandId as Id<"brands">;
  const brand = useQuery(api.brands.getById, { brandId: typedBrandId });
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

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setRequestError("Paste a competitor post URL before analyzing.");
      return;
    }

    setRequestError(null);
    setIsSubmitting(true);

    try {
      const result = await analyzeUrl({
        brandId: typedBrandId,
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
    router.push(composePath(typedBrandId, analysis.steal._id));
  }

  if (brand === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (brand === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertCircle className="text-destructive" size={28} />
        <p>Brand not found or access denied.</p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Competitor post</CardTitle>
          <CardDescription>
            Paste an X or LinkedIn URL for {brand.name}. Risk sets how sharp the
            draft comes back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="competitor-url">Competitor post URL</Label>
              <Input
                id="competitor-url"
                required
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://x.com/competitor/status/…"
                value={url}
                disabled={isProcessing}
                onChange={(event) => setUrl(event.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex gap-2">
              {(["x", "linkedin"] as const).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={targetPlatform === platform ? "default" : "outline"}
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    setTargetPlatform(platform);
                    setRiskOverride(null);
                  }}
                >
                  {platform === "x" ? "X" : "LinkedIn"}
                </Button>
              ))}
            </div>

            <RiskSlider
              value={riskLevel}
              onChange={setRiskOverride}
            />

            <div className="space-y-2">
              <Label htmlFor="user-context">Extra context (optional)</Label>
              <Input
                id="user-context"
                value={userContext}
                disabled={isProcessing}
                onChange={(event) => setUserContext(event.target.value)}
                placeholder="Angle, product launch, banned angles…"
              />
            </div>

            {requestError ? (
              <p className="text-sm text-destructive">{requestError}</p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Radar data-icon="inline-start" />
              )}
              {isProcessing ? "Analyzing…" : "Analyze competitor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!activePostId ? (
        <AnalyzeEmptyState />
      ) : isProcessing ? (
        <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Loader2 className="mb-4 size-8 animate-spin text-muted-foreground" />
          <h2 className="text-xl tracking-tight">Running analysis</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Scraping the thread and drafting your counter-narrative at risk{" "}
            {riskLevel}.
          </p>
        </div>
      ) : isFailed ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Analysis failed</CardTitle>
            <CardDescription>
              {analysis?.post.error ?? "Unknown error during analysis."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isReady && analysis?.steal ? (
        <Card>
          <CardHeader>
            <CardTitle>Aura report ready</CardTitle>
            <CardDescription>
              Score {analysis.steal.auraOpportunityScore}/100 · vs @
              {analysis.post.authorHandle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Weakness
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {analysis.steal.targetWeakness}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Draft response
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {analysis.steal.generatedResponse}
              </p>
            </div>
            <Button onClick={handleApprove} className="w-full sm:w-auto">
              Open Compose
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnalyzeEmptyState />
      )}
    </div>
  );
}
