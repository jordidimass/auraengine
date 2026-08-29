import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl tracking-tight sm:text-4xl">Preferences</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Tone, banned phrases, and default risk live on the brand — not the
        user. Wiring lands when brands persist.
      </p>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Brand {brandId}</CardTitle>
          <CardDescription>
            Placeholder until preferences mutations ship.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          LinkedIn formal, X roast, default risk, banned topics.
        </CardContent>
      </Card>
    </div>
  );
}
