"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronsUpDown,
  History,
  Plus,
  Radar,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthControls } from "@/components/auth/AuthControls";
import { CreateBrandForm } from "@/components/brands/CreateBrandForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { api, type Id } from "@/lib/convex";
import { forgetBrandId, rememberBrandId } from "@/lib/lastBrand";
import {
  DASHBOARD_PATH,
  dashboardPath,
  historyPath,
  isBrandDocumentId,
  preferencesPath,
} from "@/lib/routes";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split("/")[2];
  const brandId = isBrandDocumentId(segment) ? segment : undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"brands"> | null>(null);

  const brands = useQuery(api.brands.listMine);
  const aura = useQuery(
    api.publisher.brandAura,
    brandId ? { brandId } : "skip",
  );
  const archive = useMutation(api.brands.archive);

  useEffect(() => {
    if (brandId) rememberBrandId(brandId);
  }, [brandId]);

  const current = brands?.find((brand) => brand._id === brandId);
  const deskHref = brandId ? dashboardPath(brandId) : DASHBOARD_PATH;
  const preferencesHref = brandId ? preferencesPath(brandId) : DASHBOARD_PATH;
  const historyHref = brandId ? historyPath(brandId) : DASHBOARD_PATH;
  const deleteTarget = brands?.find((brand) => brand._id === deleteId);

  async function confirmDelete() {
    if (!deleteId) return;
    const remaining = (brands ?? []).filter((brand) => brand._id !== deleteId);
    await archive({ brandId: deleteId });
    forgetBrandId(deleteId);
    setDeleteId(null);
    if (brandId === deleteId) {
      router.push(
        remaining[0] ? dashboardPath(remaining[0]._id) : DASHBOARD_PATH,
      );
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Reply desk">
              <Link href={deskHref}>
                <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  A
                </span>
                <span className="font-semibold group-data-[collapsible=icon]:hidden">
                  Aura Engine
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={current?.name ?? "Switch brand"}
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 rounded-md">
                      <AvatarFallback className="rounded-md text-[10px]">
                        {current ? initials(current.name) : "—"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {current?.name ?? "Select brand"}
                    </span>
                    <ChevronsUpDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-56"
                  align="start"
                  side="right"
                  sideOffset={4}
                >
                  {brands === undefined ? (
                    <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
                  ) : brands.length === 0 ? (
                    <DropdownMenuItem disabled>No brands yet</DropdownMenuItem>
                  ) : (
                    brands.map((brand) => (
                      <DropdownMenuItem
                        key={brand._id}
                        onClick={() => router.push(dashboardPath(brand._id))}
                      >
                        {brand.name}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(event) => event.preventDefault()}
                    >
                      <Plus />
                      New brand
                    </DropdownMenuItem>
                  </DialogTrigger>
                  {current ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(event) => {
                        event.preventDefault();
                        setDeleteId(current._id);
                      }}
                    >
                      <Trash2 />
                      Delete {current.name}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New brand</DialogTitle>
                </DialogHeader>
                <CreateBrandForm onCreated={() => setCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.includes("/analyze")}
                  tooltip="Analyze"
                >
                  <Link href={deskHref}>
                    <Radar />
                    <span>Analyze</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.includes("/preferences")}
                  tooltip="Preferences"
                >
                  <Link href={preferencesHref}>
                    <Settings2 />
                    <span>Preferences</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.includes("/history")}
                  tooltip="History"
                >
                  <Link href={historyHref}>
                    <History />
                    <span>History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Aura earned when you publish a steal"
              className="pointer-events-none"
            >
              <Zap />
              <span className="tabular-nums">{(aura ?? 0).toLocaleString()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex justify-center px-2 group-data-[collapsible=icon]:px-0">
          <AuthControls variant="sidebar" />
        </div>
      </SidebarFooter>
      <SidebarRail />

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
    </Sidebar>
  );
}
