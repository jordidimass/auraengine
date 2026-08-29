"use client";

import { useQuery } from "convex/react";
import { ChevronDown, History, Plus, Radar, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuraCounter } from "@/components/AuraCounter";
import { AuthControls } from "@/components/auth/AuthControls";
import { CreateBrandForm } from "@/components/brands/CreateBrandForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { api } from "@/lib/convex";
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

  const brands = useQuery(api.brands.listMine);
  const aura = useQuery(
    api.publisher.brandAura,
    brandId ? { brandId } : "skip",
  );

  const current = brands?.find((brand) => brand._id === brandId);
  const analyzeHref = brandId ? dashboardPath(brandId) : DASHBOARD_PATH;
  const preferencesHref = brandId ? preferencesPath(brandId) : DASHBOARD_PATH;
  const historyHref = brandId ? historyPath(brandId) : DASHBOARD_PATH;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <Link href="/" className="flex items-center gap-2 px-1">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Aura Engine
          </span>
        </Link>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-full justify-between px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">
                      {current ? initials(current.name) : "—"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm group-data-[collapsible=icon]:hidden">
                    {current?.name ?? "Select brand"}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <Plus />
                  New brand
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New brand</DialogTitle>
            </DialogHeader>
            <CreateBrandForm onCreated={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
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
                  <Link href={analyzeHref}>
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

      <SidebarFooter className="gap-3 px-3 pb-3">
        <SidebarSeparator />
        <div className="group-data-[collapsible=icon]:hidden">
          <AuraCounter value={aura ?? 0} />
        </div>
        <AuthControls variant="sidebar" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
