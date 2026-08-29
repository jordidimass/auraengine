"use client";

import { useMutation } from "convex/react";
import { Loader2, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RiskSlider } from "@/components/RiskSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, type Doc, type Id } from "@/lib/convex";
import { platformLabel, type Platform } from "@/lib/platforms";

const TONES = ["formal", "technical", "roast", "casual"] as const;
type Tone = (typeof TONES)[number];

const DEFAULT_TOKENS = {
  primaryColor: "#1a1a1a",
  secondaryColor: "#c4a574",
  backgroundColor: "#f4efe4",
  fontFamily: "",
  visualStyle: "",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function asHex(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function PreferenceCard({
  brandId,
  preference,
}: {
  brandId: Id<"brands">;
  preference: Doc<"brand_preferences">;
}) {
  const upsert = useMutation(api.preferences.upsert);
  const togglePlatform = useMutation(api.preferences.togglePlatform);
  const [tone, setTone] = useState<Tone>(preference.tone);
  const [risk, setRisk] = useState(preference.defaultRiskLevel);
  const [maxLength, setMaxLength] = useState(String(preference.maxLength));
  const [useEmojis, setUseEmojis] = useState(preference.useEmojis);
  const [useHashtags, setUseHashtags] = useState(preference.useHashtags);
  const [customInstructions, setCustomInstructions] = useState(
    preference.customInstructions ?? "",
  );
  const [bannedPhrases, setBannedPhrases] = useState(
    preference.bannedPhrases.join(", "),
  );
  const [bannedTopics, setBannedTopics] = useState(
    preference.bannedTopics.join(", "),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTone(preference.tone);
    setRisk(preference.defaultRiskLevel);
    setMaxLength(String(preference.maxLength));
    setUseEmojis(preference.useEmojis);
    setUseHashtags(preference.useHashtags);
    setCustomInstructions(preference.customInstructions ?? "");
    setBannedPhrases(preference.bannedPhrases.join(", "));
    setBannedTopics(preference.bannedTopics.join(", "));
  }, [preference]);

  async function onToggle(enabled: boolean) {
    setError(null);
    try {
      await togglePlatform({
        brandId,
        platform: preference.platform,
        enabled,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not toggle.");
    }
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await upsert({
        brandId,
        platform: preference.platform,
        tone,
        defaultRiskLevel: risk,
        maxLength: Number.parseInt(maxLength, 10) || preference.maxLength,
        useEmojis,
        useHashtags,
        customInstructions: customInstructions.trim() || null,
        bannedPhrases: splitList(bannedPhrases),
        bannedTopics: splitList(bannedTopics),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-primary" />
          <h2 className="text-sm font-medium">
            {platformLabel(preference.platform as Platform)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enabled-${preference.platform}`} className="text-xs">
            Enabled
          </Label>
          <Switch
            id={`enabled-${preference.platform}`}
            checked={preference.enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={(value) => setTone(value as Tone)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`max-${preference.platform}`}>Max length</Label>
          <Input
            id={`max-${preference.platform}`}
            type="number"
            min={1}
            value={maxLength}
            onChange={(event) => setMaxLength(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label className="mb-2 block">Default risk</Label>
        <RiskSlider value={risk} onChange={setRisk} />
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id={`emoji-${preference.platform}`}
            checked={useEmojis}
            onCheckedChange={setUseEmojis}
          />
          <Label htmlFor={`emoji-${preference.platform}`}>Emojis</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`hash-${preference.platform}`}
            checked={useHashtags}
            onCheckedChange={setUseHashtags}
          />
          <Label htmlFor={`hash-${preference.platform}`}>Hashtags</Label>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor={`instructions-${preference.platform}`}>
          Custom instructions
        </Label>
        <Textarea
          id={`instructions-${preference.platform}`}
          value={customInstructions}
          onChange={(event) => setCustomInstructions(event.target.value)}
          rows={3}
        />
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor={`phrases-${preference.platform}`}>
          Banned phrases (comma-separated)
        </Label>
        <Input
          id={`phrases-${preference.platform}`}
          value={bannedPhrases}
          onChange={(event) => setBannedPhrases(event.target.value)}
        />
      </div>
      <div className="mt-4 grid gap-2">
        <Label htmlFor={`topics-${preference.platform}`}>
          Banned topics (comma-separated)
        </Label>
        <Input
          id={`topics-${preference.platform}`}
          value={bannedTopics}
          onChange={(event) => setBannedTopics(event.target.value)}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-4" onClick={() => void onSave()} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : null}
        Save {platformLabel(preference.platform as Platform)}
      </Button>
    </div>
  );
}

export function PreferencesForm({
  brand,
  preferences,
}: {
  brand: Doc<"brands">;
  preferences: Doc<"brand_preferences">[];
}) {
  const updateBrand = useMutation(api.brands.update);
  const [name, setName] = useState(brand.name);
  const [website, setWebsite] = useState(brand.website ?? "");
  const [industry, setIndustry] = useState(brand.industry ?? "");
  const [description, setDescription] = useState(brand.description);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [tokens, setTokens] = useState({
    ...DEFAULT_TOKENS,
    ...brand.designTokens,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(brand.name);
    setWebsite(brand.website ?? "");
    setIndustry(brand.industry ?? "");
    setDescription(brand.description);
    setLogoUrl(brand.logoUrl ?? "");
    setTokens({ ...DEFAULT_TOKENS, ...brand.designTokens });
  }, [brand]);

  async function onSaveBrand() {
    setSaving(true);
    setError(null);
    try {
      await updateBrand({
        brandId: brand._id,
        name,
        website: website.trim() || null,
        industry: industry.trim() || null,
        description,
        logoUrl: logoUrl.trim() || null,
        designTokens: {
          primaryColor: tokens.primaryColor.trim(),
          secondaryColor: tokens.secondaryColor.trim(),
          backgroundColor: tokens.backgroundColor.trim() || undefined,
          fontFamily: tokens.fontFamily.trim() || undefined,
          visualStyle: tokens.visualStyle.trim() || undefined,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save brand.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="border border-border p-4">
        <h2 className="text-sm font-medium">Brand</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="brand-name">Name</Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brand-website">Website</Label>
            <Input
              id="brand-website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brand-industry">Industry</Label>
            <Input
              id="brand-industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brand-logo">Logo URL</Label>
            <Input
              id="brand-logo"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="brand-description">Description</Label>
          <Textarea
            id="brand-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </div>
      </section>

      <section className="border border-border p-4">
        <h2 className="text-sm font-medium">Design tokens</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Generation and visuals must honor these colors, type, and style.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="token-primary">Primary color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Primary color"
                className="size-9 shrink-0 cursor-pointer border border-border bg-transparent"
                value={asHex(tokens.primaryColor, DEFAULT_TOKENS.primaryColor)}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    primaryColor: event.target.value,
                  }))
                }
              />
              <Input
                id="token-primary"
                value={tokens.primaryColor}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    primaryColor: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="token-secondary">Secondary color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Secondary color"
                className="size-9 shrink-0 cursor-pointer border border-border bg-transparent"
                value={asHex(
                  tokens.secondaryColor,
                  DEFAULT_TOKENS.secondaryColor,
                )}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    secondaryColor: event.target.value,
                  }))
                }
              />
              <Input
                id="token-secondary"
                value={tokens.secondaryColor}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    secondaryColor: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="token-bg">Background color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Background color"
                className="size-9 shrink-0 cursor-pointer border border-border bg-transparent"
                value={asHex(
                  tokens.backgroundColor,
                  DEFAULT_TOKENS.backgroundColor,
                )}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    backgroundColor: event.target.value,
                  }))
                }
              />
              <Input
                id="token-bg"
                value={tokens.backgroundColor}
                onChange={(event) =>
                  setTokens((current) => ({
                    ...current,
                    backgroundColor: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="token-font">Font family</Label>
            <Input
              id="token-font"
              value={tokens.fontFamily}
              onChange={(event) =>
                setTokens((current) => ({
                  ...current,
                  fontFamily: event.target.value,
                }))
              }
              placeholder="Azeret Mono"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="token-style">Visual style</Label>
          <Input
            id="token-style"
            value={tokens.visualStyle}
            onChange={(event) =>
              setTokens((current) => ({
                ...current,
                visualStyle: event.target.value,
              }))
            }
            placeholder="Warm newsprint, editorial stills, no neon"
          />
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button onClick={() => void onSaveBrand()} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : null}
        Save brand & tokens
      </Button>

      {preferences.map((preference) => (
        <PreferenceCard
          key={preference._id}
          brandId={brand._id}
          preference={preference}
        />
      ))}
    </div>
  );
}
