import { ConvexError } from "convex/values";
import { riskRegister } from "./risk";
import type { Platform } from "../domain";

export type AnalysisJson = {
  weakness: string;
  auraScore: number;
  response: string;
  visualPrompt: string;
};

type AnalysisInput = {
  brandName: string;
  industry?: string;
  description: string;
  tone: string;
  bannedPhrases: string[];
  bannedTopics: string[];
  customInstructions?: string;
  riskLevel: number;
  platform: Platform;
  originalContent: string;
  authorHandle: string;
  metrics: { likes: number; reposts: number; replies: number };
  topReplies: string[];
  userContext?: string;
  maxLength: number;
  useEmojis: boolean;
  useHashtags: boolean;
};

export function buildAnalysisPrompt(input: AnalysisInput): string {
  const register = riskRegister(input.riskLevel);
  return `CONTEXTO DE MARCA
  nombre: ${input.brandName}
  industria: ${input.industry ?? "n/a"}
  descripción: ${input.description}
  tono: ${input.tone}
  frases prohibidas: ${input.bannedPhrases.join(", ") || "ninguna"}
  temas vetados: ${input.bannedTopics.join(", ") || "ninguno"}
  instrucciones extra: ${input.customInstructions ?? "ninguna"}
  plataforma destino: ${input.platform}
  maxLength: ${input.maxLength}
  emojis: ${input.useEmojis ? "sí" : "no"}
  hashtags: ${input.useHashtags ? "sí" : "no"}

NIVEL DE RIESGO: ${input.riskLevel}/100
  registro: ${register}
  0-25 diplomático · 26-50 educativo · 51-75 directo · 76-100 roast

POST DEL COMPETIDOR
  autor: @${input.authorHandle}
  contenido: ${input.originalContent}
  métricas: ${input.metrics.likes} likes, ${input.metrics.reposts} reposts, ${input.metrics.replies} replies
  primeras respuestas: ${input.topReplies.join(" | ") || "ninguna"}

CONTEXTO DEL USUARIO (opcional)
  ${input.userContext ?? "ninguno"}

DEVUELVE JSON
  { "weakness": string, "auraScore": number, "response": string, "visualPrompt": string }

auraScore es 0-100. response debe respetar maxLength y el registro de riesgo.
visualPrompt describe un plano listo para fal.ai (imagen o clip de ~5s), coherente con el copy, con movimiento de cámara sutil y sin texto en pantalla.`;
}

function parseAnalysis(raw: string): AnalysisJson {
  const json = JSON.parse(raw) as Partial<AnalysisJson>;
  const weakness = json.weakness?.trim();
  const response = json.response?.trim();
  const visualPrompt = json.visualPrompt?.trim();
  const auraScore = Number(json.auraScore);
  if (!weakness || !response || !visualPrompt || !Number.isFinite(auraScore)) {
    throw new ConvexError({
      code: "LLM_INVALID_JSON",
      message: "LLM returned incomplete analysis JSON",
    });
  }
  return {
    weakness,
    response,
    visualPrompt,
    auraScore: Math.max(0, Math.min(100, Math.round(auraScore))),
  };
}

export async function runLlmAnalysis(
  input: AnalysisInput,
): Promise<AnalysisJson> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ConvexError({
      code: "MISSING_OPENAI_KEY",
      message: "OPENAI_API_KEY is not set in the Convex dashboard",
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write counter-narratives for a brand stealing competitor aura. Reply with JSON only.",
        },
        { role: "user", content: buildAnalysisPrompt(input) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ConvexError({
      code: "OPENAI_FAILED",
      message: `OpenAI failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new ConvexError({
      code: "OPENAI_FAILED",
      message: "OpenAI returned an empty analysis",
    });
  }
  return parseAnalysis(content);
}
