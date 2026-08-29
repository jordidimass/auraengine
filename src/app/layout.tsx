import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Azeret_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const azeret = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aura Engine",
  description:
    "Tu competidor ya tiene la atención. Aura Engine escribe cuando el flanco ya está abierto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${azeret.variable} h-full scroll-smooth`}>
      <body className="flex min-h-full flex-col bg-background font-mono text-foreground">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ConvexClientProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
