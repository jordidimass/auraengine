"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Radar, Settings2 } from "lucide-react";
import { AuraCounter } from "@/components/AuraCounter";
import { AuthControls } from "@/components/auth/AuthControls";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { dashboardPath, preferencesPath } from "@/lib/routes";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const brands = useQuery(api.brands.listMine);

  const routeBrandId = pathname.split("/")[2];
  const activeBrand =
    brands?.find((brand) => brand._id === routeBrandId) ?? brands?.[0] ?? null;
  const brandId = activeBrand?._id ?? routeBrandId ?? "";
  const auraTotal = useQuery(
    api.publisher.brandAura,
    activeBrand ? { brandId: activeBrand._id } : "skip",
  );

  const analyzeHref = brandId ? dashboardPath(brandId) : "/";
  const preferencesHref = brandId ? preferencesPath(brandId) : "/";

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-3 pt-3">
        <Link href="/" className="flex items-center gap-2 px-1">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Aura Engine
          </span>
        </Link>

        {brands === undefined ? (
          <div className="flex h-11 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : brands.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">
            No brands yet — create one in Convex dashboard or via API.
          </p>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-full justify-between px-2"
              >
                <span className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">
                      {activeBrand?.name.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">
                    {activeBrand?.name ?? "Select brand"}
                  </span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {brands.map((brand) => (
                <DropdownMenuItem
                  key={brand._id}
                  onClick={() =>
                    router.push(dashboardPath(brand._id as Id<"brands">))
                  }
                >
                  {brand.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.endsWith("/analyze")}
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
                  isActive={pathname.endsWith("/preferences")}
                >
                  <Link href={preferencesHref}>
                    <Settings2 />
                    <span>Preferences</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 pb-3">
        <SidebarSeparator />
        <AuraCounter value={auraTotal ?? 0} />
        <AuthControls variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}
