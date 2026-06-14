import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export type AppSettings = {
  provider: "openai" | "anthropic" | "ollama";
  openaiApiKey: string;
  anthropicApiKey: string;
  openaiModel: string;
  anthropicModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: "anthropic",
  openaiApiKey: "",
  anthropicApiKey: "",
  openaiModel: "gpt-5",
  anthropicModel: "claude-opus-4-8",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "",
};

/**
 * Whether the active provider has enough config to make a request — mirrors
 * the guards in `getModel`. Lets the UI nudge to Settings before a request
 * round-trips and fails.
 */
export function isProviderConfigured(s: AppSettings): boolean {
  switch (s.provider) {
    case "anthropic":
      return Boolean(s.anthropicApiKey);
    case "openai":
      return Boolean(s.openaiApiKey);
    case "ollama":
      return Boolean(s.ollamaModel);
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}
