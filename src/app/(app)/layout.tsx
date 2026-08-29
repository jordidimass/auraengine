import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-md">
          <SidebarTrigger />
          <span className="text-sm font-medium">Aura Engine</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
