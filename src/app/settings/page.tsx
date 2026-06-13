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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 12 6 8l4-4" />
          </svg>
          MyNodebook
        </Link>
        <h1 className="mt-3 font-display text-display text-ink">Settings</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
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
