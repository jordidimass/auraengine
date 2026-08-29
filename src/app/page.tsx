import { auth } from "@clerk/nextjs/server";
import { AuthControls } from "@/components/auth/AuthControls";
import { AsciiBanner } from "@/components/brand/AsciiBanner";
import { BrandList } from "@/components/brand/BrandList";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Problem } from "@/components/landing/Problem";
import { RiskDemo } from "@/components/landing/RiskDemo";
import { StackRow } from "@/components/landing/StackRow";
import { Team } from "@/components/landing/Team";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-dvh">
      <AsciiBanner />

      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground">
          Aura Engine
        </p>
        <AuthControls variant="nav" />
      </header>

      {userId ? (
        <BrandList />
      ) : (
        <div lang="es" className="mx-auto w-full max-w-6xl">
          <Hero />
          <RiskDemo />
          <Problem />
          <HowItWorks />
          <StackRow />
          <Team />
          <Footer />
        </div>
      )}
    </div>
  );
}
