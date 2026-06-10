"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";

export async function saveSettings(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (["openai", "anthropic", "ollama"].includes(provider)) {
    await setSetting("provider", provider);
  }

  // API key fields are write-only: an empty input means "keep the saved key".
  for (const key of ["openaiApiKey", "anthropicApiKey"] as const) {
    const value = String(formData.get(key) ?? "").trim();
    if (value) await setSetting(key, value);
  }

  for (const key of [
    "openaiModel",
    "anthropicModel",
    "ollamaBaseUrl",
    "ollamaModel",
  ] as const) {
    const raw = formData.get(key);
    if (raw !== null) await setSetting(key, String(raw).trim());
  }

  revalidatePath("/settings");
}
