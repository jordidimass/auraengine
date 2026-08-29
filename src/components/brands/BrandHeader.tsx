import type { ReactNode } from "react";

export function BrandHeader({
  brandName,
  title,
  extra,
}: {
  brandId?: string;
  brandName: string;
  title: string;
  extra?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
      <div>
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground">
          {brandName}
        </p>
        <p className="text-sm font-medium tracking-tight">{title}</p>
      </div>
      {extra}
    </header>
  );
}
