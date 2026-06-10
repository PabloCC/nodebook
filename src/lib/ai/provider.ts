import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getAppSettings } from "@/lib/settings";

export class AiConfigError extends Error {}

export async function getModel(): Promise<LanguageModel> {
  const s = await getAppSettings();

  switch (s.provider) {
    case "openai": {
      if (!s.openaiApiKey) {
        throw new AiConfigError(
          "No OpenAI API key configured. Add one in Settings."
        );
      }
      return createOpenAI({ apiKey: s.openaiApiKey })(s.openaiModel);
    }
    case "anthropic": {
      if (!s.anthropicApiKey) {
        throw new AiConfigError(
          "No Anthropic API key configured. Add one in Settings."
        );
      }
      return createAnthropic({ apiKey: s.anthropicApiKey })(s.anthropicModel);
    }
    case "ollama": {
      if (!s.ollamaModel) {
        throw new AiConfigError(
          "No Ollama model selected. Pick one in Settings."
        );
      }
      // Ollama exposes an OpenAI-compatible API under /v1.
      return createOpenAICompatible({
        name: "ollama",
        baseURL: `${s.ollamaBaseUrl.replace(/\/$/, "")}/v1`,
      })(s.ollamaModel);
    }
  }
}

export async function detectOllamaModels(
  baseUrl: string
): Promise<string[] | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}
