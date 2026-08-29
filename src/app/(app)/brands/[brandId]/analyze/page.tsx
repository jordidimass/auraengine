import { AnalyzeEmptyState } from "@/components/analyze/AnalyzeEmptyState";
import { AnalyzeForm } from "@/components/analyze/AnalyzeForm";
import { Button } from "@/components/ui/button";

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  await params;

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-3xl tracking-tight sm:text-4xl">Analyze</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Paste a competitor post. Aura reads the thread, scores the opening
            and drafts the response at your risk level.
          </p>
        </div>
        <Button variant="outline" className="h-11 shrink-0 sm:h-8">
          New analysis
        </Button>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
        <AnalyzeForm />
        <AnalyzeEmptyState />
      </div>
    </div>
  );
}
