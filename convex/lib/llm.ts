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

DEVUELVE UN SOLO OBJETO JSON. Claves EXACTAS en inglés, sin markdown:
  { "weakness": string, "auraScore": number, "response": string, "visualPrompt": string }

No traduzcas las claves. auraScore es 0-100. response debe respetar maxLength y el registro de riesgo.
visualPrompt describe un plano listo para fal.ai (imagen o clip de ~5s), coherente con el copy y con los tokens de diseño (colores, tipografía, estilo, logo), con movimiento de cámara sutil y sin texto en pantalla.`;
}

const SYSTEM_JSON_ONLY =
  "You write counter-narratives for a brand stealing competitor aura. Reply with one JSON object only. Keys must be exactly weakness, auraScore, response, visualPrompt. Never wrap in markdown. Never translate the keys.";

function invalidAnalysisJson(): never {
  throw new ConvexError({
    code: "LLM_INVALID_JSON",
    message: "LLM returned incomplete analysis JSON",
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function firstNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function extractJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates: string[] = [];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    candidates.push(fence[1].trim());
  }
  candidates.push(trimmed);
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (unfenced !== trimmed) {
    candidates.push(unfenced);
  }
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start >= 0 && end > start) {
    candidates.push(unfenced.slice(start, end + 1));
  }
  return [...new Set(candidates)];
}

function unwrapAnalysisRecord(parsed: unknown): Record<string, unknown> | null {
  const record = asRecord(parsed);
  if (record === null) {
    return null;
  }
  if (
    firstString(record, ["weakness", "debilidad", "gap", "critique"]) ||
    firstString(record, ["response", "respuesta", "copy", "counter"])
  ) {
    return record;
  }
  for (const nestedKey of ["analysis", "data", "result", "json"]) {
    const nested = asRecord(record[nestedKey]);
    if (nested !== null) {
      return nested;
    }
  }
  return record;
}

export function parseAnalysis(raw: string): AnalysisJson {
  let parsed: unknown;
  for (const candidate of extractJsonCandidates(raw)) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      parsed = undefined;
    }
  }
  if (parsed === undefined) {
    invalidAnalysisJson();
  }

  const json = unwrapAnalysisRecord(parsed);
  if (json === null) {
    invalidAnalysisJson();
  }

  const weakness = firstString(json, [
    "weakness",
    "debilidad",
    "gap",
    "critique",
  ]);
  const response = firstString(json, [
    "response",
    "respuesta",
    "copy",
    "counter",
    "counterNarrative",
    "reply",
  ]);
  const visualPrompt = firstString(json, [
    "visualPrompt",
    "visual_prompt",
    "promptVisual",
    "imagePrompt",
    "videoPrompt",
  ]);
  const auraScore = firstNumber(json, [
    "auraScore",
    "aura_score",
    "score",
    "puntuacion",
    "puntuación",
  ]);

  if (!weakness || !response || !visualPrompt || auraScore === undefined) {
    invalidAnalysisJson();
  }

  return {
    weakness,
    response,
    visualPrompt,
    auraScore: Math.max(0, Math.min(100, Math.round(auraScore))),
  };
}

function readMessageContent(body: unknown): string | undefined {
  const record = asRecord(body);
  const choices = record?.choices;
  if (!Array.isArray(choices) || choices[0] === undefined) {
    return undefined;
  }
  const message = asRecord(choices[0])?.message;
  const messageRecord = asRecord(message);
  if (messageRecord === null) {
    return undefined;
  }

  const content = messageRecord.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        const partRecord = asRecord(part);
        return typeof partRecord?.text === "string" ? partRecord.text : "";
      })
      .join("");
    if (joined.trim()) {
      return joined;
    }
  }

  return typeof messageRecord.reasoning === "string" &&
    messageRecord.reasoning.trim()
    ? messageRecord.reasoning
    : undefined;
}

async function completeChat(
  provider: LlmProvider,
  input: AnalysisInput,
  options: { temperature: number; extraUserNote?: string },
): Promise<string> {
  const userContent = options.extraUserNote
    ? `${buildAnalysisPrompt(input)}\n\n${options.extraUserNote}`
    : buildAnalysisPrompt(input);

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
      temperature: options.temperature,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_JSON_ONLY },
        { role: "user", content: userContent },
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

  const content = readMessageContent(await response.json());
  if (!content) {
    throw new ConvexError({
      code: provider.errorCode,
      message: `${provider.name} returned an empty analysis`,
    });
  }
  return content;
}

export async function runLlmAnalysis(
  input: AnalysisInput,
): Promise<AnalysisJson> {
  const provider = resolveLlmProvider();
  const first = await completeChat(provider, input, { temperature: 0.7 });
  try {
    return parseAnalysis(first);
  } catch {
    console.error("LLM analysis JSON parse failed, retrying", first.slice(0, 400));
    const retry = await completeChat(provider, input, {
      temperature: 0,
      extraUserNote:
        'Return ONLY this shape: {"weakness":"...","auraScore":72,"response":"...","visualPrompt":"..."}',
    });
    try {
      return parseAnalysis(retry);
    } catch {
      console.error("LLM analysis JSON retry also failed", retry.slice(0, 400));
      invalidAnalysisJson();
    }
  }
}
