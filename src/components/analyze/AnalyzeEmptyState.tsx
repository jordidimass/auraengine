import { ScanSearch } from "lucide-react";

export function AnalyzeEmptyState() {
  return (
    <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center motion-safe:animate-[empty-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]">
      <ScanSearch className="mb-4 size-8 text-muted-foreground" />
      <h2 className="text-2xl tracking-tight text-foreground">No analysis yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The report lands here: detected weakness, Aura score, and a draft
        response you can send straight to Compose.
      </p>
    </div>
  );
}
