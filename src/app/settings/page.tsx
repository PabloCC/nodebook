import Link from "next/link";
import { getAppSettings, maskKey } from "@/lib/settings";
import { detectOllamaModels } from "@/lib/ai/provider";
import { SettingsForm } from "@/components/settings/SettingsForm";

// Reads local settings and probes Ollama on every request — never prerender.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getAppSettings();
  const ollamaModels = await detectOllamaModels(s.ollamaBaseUrl);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← MyNodebook
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Bring your own API key, or run fully local with Ollama. Keys are
          stored only in your local database.
        </p>
      </header>

      <SettingsForm
        settings={{
          provider: s.provider,
          openaiModel: s.openaiModel,
          anthropicModel: s.anthropicModel,
          ollamaBaseUrl: s.ollamaBaseUrl,
          ollamaModel: s.ollamaModel,
          openaiKeyMasked: maskKey(s.openaiApiKey),
          anthropicKeyMasked: maskKey(s.anthropicApiKey),
        }}
        ollamaModels={ollamaModels}
      />
    </main>
  );
}
