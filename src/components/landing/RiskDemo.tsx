"use client";

import { useState } from "react";
import { AuraCounter } from "@/components/AuraCounter";
import { riskBandFor, type RiskBand } from "@/components/RiskSlider";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ReplyVariant {
  id: RiskBand;
  label: string;
  body: string;
}

const COMPETITOR_POST =
  "Lanzamos el generador más rápido del mercado. Un tema, 8 segundos, post listo. El 90% de los equipos ya no necesita estrategas.";

const WEAKNESS =
  "Confunde velocidad con oportunidad. La cifra del 90% no tiene fuente y los replies ya la están pidiendo.";

const REPLIES: ReplyVariant[] = [
  {
    id: "diplomatic",
    label: "Diplomático",
    body: "El tiempo de generación importa, y 8 segundos es un número limpio. El cuello de botella que estamos viendo no es escribir: es saber si ese post sale en el momento correcto. Un estratega que detecta el flanco abierto de un competidor rinde más que diez posts rápidos al vacío.",
  },
  {
    id: "educational",
    label: "Educativo",
    body: "Generar en 8 segundos no resuelve el problema. Si el post no entra en una conversación que ya tiene atención, es inventario. El 90% no «ya no necesita estrategas»: necesita alguien que lea el hilo del competidor, encuentre el dato flojo y responda ahí. Velocidad sin timing es ruido.",
  },
  {
    id: "direct",
    label: "Directo",
    body: "Ocho segundos para un post que nadie pidió no es una ventaja. Es producir más de lo mismo. El 90% de los equipos no abandonó a los estrategas: los estrategas se fueron porque las herramientas escriben en el vacío. Si no puedes señalar qué está mal en el argumento del competidor, tu generador solo acelera el desperdicio.",
  },
  {
    id: "roast",
    label: "Roast",
    body: "Felicitaciones: ahora pueden ser irrelevantes en 8 segundos en vez de en 8 minutos. Nadie pidió más posts. Pidieron uno que entre cuando el competidor ya tiene la atención y se dejó el flanco abierto. «El 90% ya no necesita estrategas» es exactamente el tipo de cifra que se dice cuando no hay un hilo que defender.",
  },
];

const BAND_LABELS: Record<RiskBand, string> = {
  diplomatic: "Diplomático",
  educational: "Educativo",
  direct: "Directo",
  roast: "Roast",
};

function replyFor(value: number): ReplyVariant {
  const band = riskBandFor(value);
  const match = REPLIES.find((item) => item.id === band.id);
  if (!match) {
    throw new Error(`Missing reply for band ${band.id}`);
  }
  return match;
}

export function RiskDemo() {
  const [riskLevel, setRiskLevel] = useState(64);
  const band = riskBandFor(riskLevel);
  const reply = replyFor(riskLevel);
  const isRoast = band.id === "roast";

  return (
    <section id="el-motor" className="scroll-mt-8 px-3 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        El motor, en vivo
      </p>
      <h2 className="mt-3 text-lg tracking-tight sm:text-xl">
        Sin registro. Mueve la barra.
      </h2>

      <div className="mt-8 grid border border-border lg:grid-cols-2">
        <div className="flex flex-col gap-6 border-border p-4 sm:p-6 max-lg:border-b lg:border-r">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Post del competidor · X
            </p>
            <blockquote className="mt-3 text-sm leading-relaxed">
              {COMPETITOR_POST}
            </blockquote>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Debilidad detectada
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {WEAKNESS}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <AuraCounter
            value={87}
            label="Aura Opportunity Score"
            suffix="/100"
            valueClassName="text-4xl"
          />

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Nivel de riesgo</p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isRoast ? "text-risk" : "text-foreground",
                  )}
                >
                  {BAND_LABELS[band.id]}
                </p>
              </div>
              <span
                className={cn(
                  "font-mono text-lg tabular-nums",
                  isRoast ? "text-risk" : "text-primary",
                )}
              >
                {riskLevel}
              </span>
            </div>

            <Slider
              min={0}
              max={100}
              step={1}
              value={[riskLevel]}
              onValueChange={(next) => setRiskLevel(next[0] ?? 0)}
              aria-label="Nivel de riesgo"
              className={cn(isRoast && "[&_[data-slot=slider-range]]:bg-risk")}
            />

            <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {REPLIES.map((item) => (
                <span
                  key={item.id}
                  className={cn(item.id === band.id && "text-foreground")}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Tu respuesta
            </p>
            <p
              key={band.id}
              className="mt-3 text-sm leading-relaxed motion-safe:animate-[reveal-up_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
            >
              {reply.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
