"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/brands/BrandHeader";
import { api } from "@/lib/convex";
import { platformLabel, type Platform } from "@/lib/platforms";
import { composePath, isBrandDocumentId } from "@/lib/routes";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function statusLabel(status: string) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "draft") return "Draft";
  return status;
}

export default function HistoryPage() {
  const params = useParams<{ brandId: string }>();
  const rawBrandId = params.brandId;
  const brandId = isBrandDocumentId(rawBrandId) ? rawBrandId : null;

  const brand = useQuery(api.brands.getById, brandId ? { brandId } : "skip");
  const rows = useQuery(
    api.analysis.listByBrand,
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

  if (brand === undefined || rows === undefined) {
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
      <BrandHeader brandName={brand.name} title="History" />
      <main className="mx-auto flex max-w-4xl flex-col gap-3 px-3 py-8 sm:px-6 sm:py-12">
        {rows.length === 0 ? (
          <p className="border border-border p-4 text-sm text-muted-foreground">
            No steals yet. Analyze a competitor post to start a history.
          </p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.stealId}
              href={composePath(brandId, row.stealId)}
              className="block border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {platformLabel(row.platform as Platform)}
                  {row.authorHandle ? ` · @${row.authorHandle}` : ""}
                </p>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {statusLabel(row.publicationStatus)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {row.weakness}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{formatDate(row.createdAt)}</span>
                <span className="font-mono">Aura {row.auraScore}</span>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
