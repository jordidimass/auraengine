"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { dashboardPath, DASHBOARD_PATH, isBrandDocumentId, preferencesPath } from "@/lib/routes";

export function AppSidebar() {
  const pathname = usePathname();
  const brandId = pathname.split("/")[2];
  const analyzeHref = isBrandDocumentId(brandId)
    ? dashboardPath(brandId)
    : DASHBOARD_PATH;
  const preferencesHref = isBrandDocumentId(brandId)
    ? preferencesPath(brandId)
    : DASHBOARD_PATH;

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-between px-2"
            >
              <span className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">NL</AvatarFallback>
                </Avatar>
                <span className="text-sm">Northwind Labs</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled>Northwind Labs</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <AuraCounter value={12480} />
        <AuthControls variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}
