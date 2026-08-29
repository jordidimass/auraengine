import { auth } from "@clerk/nextjs/server";
import { UserEnsure } from "@/components/auth/UserEnsure";
import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <UserEnsure>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">Aura Engine</span>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </UserEnsure>
  );
}
