"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { DASHBOARD_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="px-3 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both]">
        Inteligencia competitiva · Track 01 — Content Machine
      </p>
      <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,6vw,4rem)] leading-[1.1] tracking-tight motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_40ms_both]">
        Tu competidor ya tiene la atención. Y dejó el flanco abierto.
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_80ms_both]">
        Pega su link. Aura encuentra la debilidad del argumento, la puntúa de 0
        a 100 y escribe tu respuesta con imagen y voz.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">
        <Button asChild size="lg" className="h-11 w-full sm:w-auto">
          <Link href="#el-motor">Probar el motor</Link>
        </Button>
        <SignInButton
          mode="modal"
          fallbackRedirectUrl={DASHBOARD_PATH}
          signUpFallbackRedirectUrl={DASHBOARD_PATH}
        >
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 w-full sm:w-auto",
            )}
          >
            Sign in
          </span>
        </SignInButton>
      </div>
    </section>
  );
}
