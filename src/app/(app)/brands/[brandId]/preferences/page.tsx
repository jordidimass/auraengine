import { PreferencesWorkspace } from "@/components/preferences/PreferencesWorkspace";

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <PreferencesWorkspace brandId={brandId} />
    </div>
  );
}
