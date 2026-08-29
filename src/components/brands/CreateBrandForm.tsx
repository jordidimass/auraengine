"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzePath } from "@/lib/routes";
import { api } from "../../../convex/_generated/api";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Could not create brand.";
}

export function CreateBrandForm() {
  const createBrand = useMutation(api.brands.create);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const trimmedWebsite = website.trim();
      const brandId = await createBrand({
        name: name.trim(),
        description: description.trim(),
        website: trimmedWebsite.length > 0 ? trimmedWebsite : undefined,
      });
      router.push(analyzePath(brandId));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-3 border border-border p-4"
    >
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        New brand
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Name</span>
        <Input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Aura Engine"
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Description</span>
        <Input
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Competitor reply desk"
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Website (optional)</span>
        <Input
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="https://auraengine.xyz"
          disabled={pending}
        />
      </label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Creating…
          </>
        ) : (
          "Create brand"
        )}
      </Button>
    </form>
  );
}
