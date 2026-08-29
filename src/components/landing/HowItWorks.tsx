interface Step {
  n: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Pega el link",
    body: "Apify y Exa traen el post, las métricas y los replies que ya huelen a debilidad.",
  },
  {
    n: "02",
    title: "El motor puntúa",
    body: "Un LLM aísla el hueco del argumento y calcula el Aura Opportunity Score de 0 a 100.",
  },
  {
    n: "03",
    title: "Elige el riesgo",
    body: "De diplomático a roast. Sale copy con tu tono, imagen (fal.ai) y voz (ElevenLabs).",
  },
];

export function HowItWorks() {
  return (
    <section className="px-3 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        Cómo funciona
      </p>
      <h2 className="mt-3 text-lg tracking-tight sm:text-xl">Tres pasos.</h2>

      <ol className="mt-8 grid gap-0 border border-border sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="border-border p-4 sm:border-r sm:last:border-r-0 max-sm:border-b max-sm:last:border-b-0 sm:p-6"
          >
            <span className="text-2xl tabular-nums text-muted-foreground">
              {step.n}
            </span>
            <h3 className="mt-3 text-sm tracking-wide">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
