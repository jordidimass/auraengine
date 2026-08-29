"use client";

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
import { analyzePath } from "@/lib/routes";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Platform = "x" | "linkedin";

function platformLabel(platform: Platform) {
  return platform === "x" ? "X (Twitter)" : "LinkedIn";
}

export function PreferencesWorkspace({ brandId }: { brandId: string }) {
  const typedBrandId = brandId as Id<"brands">;
  const brand = useQuery(api.brands.getById, { brandId: typedBrandId });
  const preferences = useQuery(api.preferences.getByBrand, { brandId: typedBrandId });
  const upsertPreference = useMutation(api.preferences.upsert);
  const togglePlatform = useMutation(api.preferences.togglePlatform);

  const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Partial<
      Record<
        Platform,
        {
          defaultRiskLevel?: number;
          tone?: "formal" | "technical" | "roast" | "casual";
          maxLength?: number;
          useEmojis?: boolean;
          useHashtags?: boolean;
        }
      >
    >
  >({});

  const drafts = useMemo(() => {
    if (!preferences) {
      return {} as Record<
        Platform,
        {
          defaultRiskLevel: number;
          tone: "formal" | "technical" | "roast" | "casual";
          maxLength: number;
          useEmojis: boolean;
          useHashtags: boolean;
        }
      >;
    }

    const next: Record<
      Platform,
      {
        defaultRiskLevel: number;
        tone: "formal" | "technical" | "roast" | "casual";
        maxLength: number;
        useEmojis: boolean;
        useHashtags: boolean;
      }
    > = {} as Record<
      Platform,
      {
        defaultRiskLevel: number;
        tone: "formal" | "technical" | "roast" | "casual";
        maxLength: number;
        useEmojis: boolean;
        useHashtags: boolean;
      }
    >;

    for (const pref of preferences) {
      const override = overrides[pref.platform];
      next[pref.platform] = {
        defaultRiskLevel:
          override?.defaultRiskLevel ?? pref.defaultRiskLevel,
        tone: override?.tone ?? pref.tone,
        maxLength: override?.maxLength ?? pref.maxLength,
        useEmojis: override?.useEmojis ?? pref.useEmojis,
        useHashtags: override?.useHashtags ?? pref.useHashtags,
      };
    }

    return next;
  }, [overrides, preferences]);

  if (brand === undefined || preferences === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (brand === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
        <p>Brand not found or access denied.</p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  async function handleSave(platform: Platform) {
    const draft = drafts[platform];
    const existing = preferences?.find((p) => p.platform === platform);
    if (!draft || !existing) {
      return;
    }

    setSavingPlatform(platform);
    setError(null);
    try {
      await upsertPreference({
        brandId: typedBrandId,
        platform,
        tone: draft.tone,
        defaultRiskLevel: draft.defaultRiskLevel,
        maxLength: draft.maxLength,
        useEmojis: draft.useEmojis,
        useHashtags: draft.useHashtags,
        customInstructions: existing.customInstructions ?? null,
        bannedPhrases: existing.bannedPhrases,
        bannedTopics: existing.bannedTopics,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSavingPlatform(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight sm:text-4xl">Preferences</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Tone, default risk, and platform toggles for {brand.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={analyzePath(typedBrandId)}>Go to Analyze</Link>
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid max-w-3xl gap-4">
        {preferences.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No preferences yet. Create a brand with default platforms first.
            </CardContent>
          </Card>
        ) : (
          preferences.map((preference) => {
            const draft = drafts[preference.platform];
            if (!draft) {
              return null;
            }
            return (
              <Card key={preference._id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>{platformLabel(preference.platform)}</CardTitle>
                    <CardDescription>
                      {preference.enabled ? "Active" : "Disabled"}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void togglePlatform({
                        brandId: typedBrandId,
                        platform: preference.platform,
                        enabled: !preference.enabled,
                      })
                    }
                  >
                    {preference.enabled ? "Disable" : "Enable"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RiskSlider
                    value={draft.defaultRiskLevel}
                    onChange={(value) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [preference.platform]: {
                          ...prev[preference.platform],
                          defaultRiskLevel: value,
                        },
                      }))
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={draft.tone}
                        onChange={(event) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [preference.platform]: {
                              ...prev[preference.platform],
                              tone: event.target.value as typeof draft.tone,
                            },
                          }))
                        }
                      >
                        <option value="formal">Formal</option>
                        <option value="technical">Technical</option>
                        <option value="casual">Casual</option>
                        <option value="roast">Roast</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max length</Label>
                      <input
                        type="number"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={draft.maxLength}
                        onChange={(event) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [preference.platform]: {
                              ...prev[preference.platform],
                              maxLength: Number(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.useEmojis}
                        onChange={(event) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [preference.platform]: {
                              ...prev[preference.platform],
                              useEmojis: event.target.checked,
                            },
                          }))
                        }
                      />
                      Use emojis
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.useHashtags}
                        onChange={(event) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [preference.platform]: {
                              ...prev[preference.platform],
                              useHashtags: event.target.checked,
                            },
                          }))
                        }
                      />
                      Use hashtags
                    </label>
                  </div>
                  <Button
                    type="button"
                    disabled={savingPlatform === preference.platform}
                    onClick={() => void handleSave(preference.platform)}
                  >
                    {savingPlatform === preference.platform ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : null}
                    Save {platformLabel(preference.platform)}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
