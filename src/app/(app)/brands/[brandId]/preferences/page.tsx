"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/brands/BrandHeader";
import { PreferencesForm } from "@/components/brands/PreferencesForm";
import { api } from "@/lib/convex";
import { isBrandDocumentId } from "@/lib/routes";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function PreferencesPage() {
  const params = useParams<{ brandId: string }>();
  const rawBrandId = params.brandId;
  const brandId = isBrandDocumentId(rawBrandId) ? rawBrandId : null;

  const brand = useQuery(api.brands.getById, brandId ? { brandId } : "skip");
  const preferences = useQuery(
    api.preferences.getByBrand,
    brandId ? { brandId } : "skip",
  );

  if (!brandId) {
    return (
      <CenteredMessage>
        <p>Brand not found or you do not have access.</p>
        <Link href="/" className="text-primary hover:underline">
          Back home
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
        <p>Brand not found or you do not have access.</p>
        <Link href="/" className="text-primary hover:underline">
          Back home
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <div>
      <BrandHeader brandName={brand.name} title="Preferences" />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-3 py-8 sm:px-6 sm:py-12">
        <PreferencesForm brand={brand} preferences={preferences} />
      </main>
    </div>
  );
}
