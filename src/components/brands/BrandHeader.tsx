import Link from "next/link";
import type { ReactNode } from "react";
import { analyzePath, preferencesPath } from "@/lib/routes";

export function BrandHeader({
  brandId,
  brandName,
  title,
  extra,
}: {
  brandId: string;
  brandName: string;
  title: string;
  extra?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
      <div>
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground">
          {brandName}
        </p>
        <p className="text-sm font-medium tracking-tight">{title}</p>
      </div>
      <nav className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
          <Link
            href={preferencesPath(brandId)}
            className="transition hover:text-foreground"
          >
            Preferences
          </Link>
          <Link
            href={analyzePath(brandId)}
            className="transition hover:text-foreground"
          >
            Analyze
          </Link>
          <Link href="/" className="transition hover:text-foreground">
            Dashboard
          </Link>
        </div>
        {extra}
      </nav>
    </header>
  );
}
