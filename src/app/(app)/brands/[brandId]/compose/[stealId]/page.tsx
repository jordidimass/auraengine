import { ComposeWorkspace } from "@/components/compose/ComposeWorkspace";

export default async function ComposePage({
  params,
}: {
  params: Promise<{ brandId: string; stealId: string }>;
}) {
  const { brandId, stealId } = await params;

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <ComposeWorkspace brandId={brandId} stealId={stealId} />
    </div>
  );
}
