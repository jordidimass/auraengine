"use client";

import { useQuery } from "convex/react";
import { Loader2, Settings2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/brands/BrandHeader";
import { platformLabel } from "@/lib/platforms";
import { isBrandDocumentId } from "@/lib/routes";
import { api } from "../../../../../convex/_generated/api";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function PreferencesPage() {
  const params = useParams<{ brandId: string }>();
  const rawBrandId = params.brandId;
  const brandId = isBrandDocumentId(rawBrandId) ? rawBrandId : null;

  const brand = useQuery(
    api.brands.getById,
    brandId ? { brandId } : "skip",
  );
  const preferences = useQuery(
    api.preferences.getByBrand,
    brandId ? { brandId } : "skip",
  );

  if (!brandId) {
    return (
      <CenteredMessage>
        <p>Marca no encontrada o sin acceso.</p>
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </CenteredMessage>
    );
  }

  if (brand === undefined || preferences === undefined) {
    return (
      <CenteredMessage>
        <Loader2 className="animate-spin" size={24} />
      </CenteredMessage>
    );
  }

  if (brand === null) {
    return (
      <CenteredMessage>
        <p>Marca no encontrada o sin acceso.</p>
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <div className="min-h-dvh">
      <BrandHeader brandId={brandId} brandName={brand.name} title="Preferences" />

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-3 py-8 sm:px-6 sm:py-12">
        {preferences.length === 0 ? (
          <div className="border border-border p-4 text-sm text-muted-foreground">
            No hay preferencias configuradas para esta marca todavía.
          </div>
        ) : (
          preferences.map((preference) => (
            <div key={preference._id} className="border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-primary" />
                  <h2 className="text-sm font-medium">
                    {platformLabel(preference.platform)}
                  </h2>
                </div>
                <span
                  className={
                    preference.enabled
                      ? "rounded-full bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-widest text-primary"
                      : "rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground"
                  }
                >
                  {preference.enabled ? "Activo" : "Off"}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Tono</dt>
                  <dd className="mt-1 capitalize">{preference.tone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Riesgo default
                  </dt>
                  <dd className="mt-1 font-mono">
                    {preference.defaultRiskLevel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Max length</dt>
                  <dd className="mt-1 font-mono">{preference.maxLength}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Emojis / hashtags
                  </dt>
                  <dd className="mt-1">
                    {preference.useEmojis ? "Emojis" : "Sin emojis"} ·{" "}
                    {preference.useHashtags ? "Hashtags" : "Sin hashtags"}
                  </dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
