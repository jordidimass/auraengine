"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateBrandForm } from "@/components/brands/CreateBrandForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type Id } from "@/lib/convex";
import { forgetBrandId } from "@/lib/lastBrand";
import { analyzePath, historyPath, preferencesPath } from "@/lib/routes";

export function BrandList() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const brands = useQuery(api.brands.listMine, isAuthenticated ? {} : "skip");
  const archive = useMutation(api.brands.archive);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"brands"> | null>(null);
  const deleteTarget = brands?.find((brand) => brand._id === deleteId);

  async function confirmDelete() {
    if (!deleteId) return;
    await archive({ brandId: deleteId });
    forgetBrandId(deleteId);
    setDeleteId(null);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
            Your brands
          </p>
          <h1 className="mt-3 text-xl leading-snug tracking-tight sm:text-2xl">
            Pick a brand to open the reply desk.
          </h1>
        </div>
        {brands && brands.length > 0 ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New brand
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading brands…
        </div>
      ) : !isAuthenticated ? (
        <p className="text-sm text-muted-foreground">
          Clerk signed you in, but it has no JWT named <code>convex</code>, so
          Convex cannot verify the session. In Clerk: JWT Templates → New
          template → Convex (the name must be <code>convex</code>), or activate
          the Convex integration. Then sign out and back in.
        </p>
      ) : brands === undefined ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading brands…
        </div>
      ) : brands.length === 0 ? (
        <CreateBrandForm />
      ) : (
        <ul className="grid gap-0 border border-border sm:grid-cols-2">
          {brands.map((brand) => (
            <li
              key={brand._id}
              className="flex flex-col gap-3 border-border p-4 sm:border-r sm:even:border-r-0 max-sm:border-b max-sm:last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{brand.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {brand.description}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3">
                <Link
                  href={analyzePath(brand._id)}
                  className="text-xs uppercase tracking-widest text-primary transition hover:opacity-80"
                >
                  Analyze
                </Link>
                <Link
                  href={historyPath(brand._id)}
                  className="text-xs uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
                >
                  History
                </Link>
                <Link
                  href={preferencesPath(brand._id)}
                  className="text-xs uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
                >
                  Preferences
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteId(brand._id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs uppercase tracking-widest text-destructive transition hover:opacity-80"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New brand</DialogTitle>
          </DialogHeader>
          <CreateBrandForm onCreated={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name ?? "brand"}?</DialogTitle>
            <DialogDescription>
              Hides this brand from your list. History stays in the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
