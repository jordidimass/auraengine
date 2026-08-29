import { AnalyzeWorkspace } from "@/components/analyze/AnalyzeWorkspace";

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-xl">
        <h1 className="text-3xl tracking-tight sm:text-4xl">Analyze</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Paste a competitor post. Aura reads the thread, scores the opening,
          and drafts the response at your risk level.
        </p>
      </div>

      <AnalyzeWorkspace brandId={brandId} />
    </div>
  );
}
