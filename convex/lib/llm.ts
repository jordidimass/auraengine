import { ConvexError } from "convex/values";
import { riskRegister } from "./risk";
import type { Platform } from "../domain";

export type AnalysisJson = {
  weakness: string;
  auraScore: number;
  response: string;
  visualPrompt: string;
};

export type AnalysisInput = {
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
  logoUrl?: string;
  designTokens?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor?: string;
    fontFamily?: string;
    visualStyle?: string;
  };
};

type LlmProvider = {
  name: "OpenRouter" | "OpenAI";
  errorCode: "OPENROUTER_FAILED" | "OPENAI_FAILED";
  endpoint: string;
  model: string;
  headers: Record<string, string>;
};

function resolveLlmProvider(): LlmProvider {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterApiKey) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Aura Engine",
    };
    const siteUrl = process.env.SITE_URL?.trim();
    if (siteUrl) headers["HTTP-Referer"] = siteUrl;

    return {
      name: "OpenRouter",
      errorCode: "OPENROUTER_FAILED",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o",
      headers,
    };
  }

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiApiKey) {
    return {
      name: "OpenAI",
      errorCode: "OPENAI_FAILED",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
    };
  }

  throw new ConvexError({
    code: "MISSING_LLM_KEY",
    message:
      "Set OPENROUTER_API_KEY (preferred) or OPENAI_API_KEY in the Convex dashboard",
  });
}

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

TOKENS DE DISEÑO
  color primario: ${input.designTokens?.primaryColor ?? "n/a"}
  color secundario: ${input.designTokens?.secondaryColor ?? "n/a"}
  color de fondo: ${input.designTokens?.backgroundColor ?? "n/a"}
  tipografía: ${input.designTokens?.fontFamily ?? "n/a"}
  estilo visual: ${input.designTokens?.visualStyle ?? "n/a"}
  logo: ${input.logoUrl ?? "n/a"}

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
visualPrompt describe un plano listo para fal.ai (imagen o clip de ~5s), coherente con el copy y con los tokens de diseño (colores, tipografía, estilo, logo), con movimiento de cámara sutil y sin texto en pantalla.`;
}

function parseAnalysis(raw: string): AnalysisJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConvexError({
      code: "LLM_INVALID_JSON",
      message: "LLM returned incomplete analysis JSON",
    });
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new ConvexError({
      code: "LLM_INVALID_JSON",
      message: "LLM returned incomplete analysis JSON",
    });
  }
  const json = parsed as Partial<AnalysisJson>;
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
  const provider = resolveLlmProvider();

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
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
      code: provider.errorCode,
      message: `${provider.name} failed (${response.status}): ${detail.slice(0, 300)}`,
    });
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new ConvexError({
      code: provider.errorCode,
      message: `${provider.name} returned an empty analysis`,
    });
  }
  return parseAnalysis(content);
}
