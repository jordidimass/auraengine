import { AuthControls } from "@/components/auth/AuthControls";
import { AsciiBanner } from "@/components/brand/AsciiBanner";

const STEPS = [
  {
    n: "01",
    title: "Paste the thread",
    body: "Drop a competitor URL. Aura pulls the post, metrics, and the replies that already smell weakness.",
  },
  {
    n: "02",
    title: "Set the risk",
    body: "Diplomatic to roast. One slider. The draft changes register, not just adjectives.",
  },
  {
    n: "03",
    title: "Send the counter",
    body: "Weakness, Aura score, and a reply you can send to Compose without rewriting the brief.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <AsciiBanner />

      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground">
          Aura Engine
        </p>
        <AuthControls variant="nav" />
      </header>

      <main className="px-3 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both]">
          Competitor reply desk
        </p>
        <h1 className="mt-3 max-w-[22ch] text-xl leading-snug tracking-tight sm:text-2xl motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_40ms_both]">
          Steal the reply they left on the table.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_80ms_both]">
          Paste a competitor post. Aura reads the thread, scores the opening,
          and drafts the response at your risk level — diplomatic through roast.
        </p>

        <div className="mt-8 motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_120ms_both]">
          <AuthControls variant="hero" />
        </div>

        <ol className="mt-12 grid gap-0 border border-border sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.n}
              className="border-border p-4 motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both] sm:border-r sm:last:border-r-0 max-sm:border-b max-sm:last:border-b-0"
              style={{ animationDelay: `${160 + index * 50}ms` }}
            >
              <span className="text-xs text-muted-foreground">{step.n}</span>
              <h2 className="mt-2 text-sm tracking-wide">{step.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
