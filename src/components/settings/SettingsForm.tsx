"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions/settings";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const OPENAI_MODEL_SUGGESTIONS = ["gpt-5", "gpt-5-mini", "gpt-4o"];
const ANTHROPIC_MODEL_SUGGESTIONS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

type ClientSettings = {
  provider: "openai" | "anthropic" | "ollama";
  openaiModel: string;
  anthropicModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiKeyMasked: string;
  anthropicKeyMasked: string;
};

export function SettingsForm({
  settings,
  ollamaModels,
}: {
  settings: ClientSettings;
  ollamaModels: string[] | null;
}) {
  const [provider, setProvider] = useState(settings.provider);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await saveSettings(formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
      }
      className="mt-8 space-y-8"
    >
      <fieldset>
        <legend className="text-sm font-semibold">Appearance</legend>
        <p className="mt-1 text-xs text-muted">
          Theme is stored in this browser, separate from your provider settings.
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">AI provider</legend>
        <div className="pill-group mt-3">
          {(
            [
              ["anthropic", "Anthropic"],
              ["openai", "OpenAI"],
              ["ollama", "Ollama (local)"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`pill-tab cursor-pointer ${
                provider === value ? "pill-tab-active" : ""
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={value}
                checked={provider === value}
                onChange={() => setProvider(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {provider === "anthropic" && (
        <ProviderSection
          keyName="anthropicApiKey"
          keyMasked={settings.anthropicKeyMasked}
          keyPlaceholder="sk-ant-…"
          modelName="anthropicModel"
          modelDefault={settings.anthropicModel}
          modelSuggestions={ANTHROPIC_MODEL_SUGGESTIONS}
        />
      )}

      {provider === "openai" && (
        <ProviderSection
          keyName="openaiApiKey"
          keyMasked={settings.openaiKeyMasked}
          keyPlaceholder="sk-…"
          modelName="openaiModel"
          modelDefault={settings.openaiModel}
          modelSuggestions={OPENAI_MODEL_SUGGESTIONS}
        />
      )}

      {provider === "ollama" && (
        <div className="space-y-4">
          <Field label="Ollama base URL">
            <input
              name="ollamaBaseUrl"
              defaultValue={settings.ollamaBaseUrl}
              className="input-field"
            />
          </Field>
          <Field
            label="Model"
            hint={
              ollamaModels === null
                ? "Ollama not detected at the configured URL. Is it running?"
                : ollamaModels.length === 0
                  ? "Ollama is running but has no models. Try `ollama pull llama3.2`."
                  : `Ollama detected — ${ollamaModels.length} model(s) available.`
            }
          >
            <input
              name="ollamaModel"
              defaultValue={settings.ollamaModel}
              list="ollama-models"
              placeholder="llama3.2"
              className="input-field"
            />
            <datalist id="ollama-models">
              {(ollamaModels ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-5"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-success">Saved.</span>}
      </div>
    </form>
  );
}

function ProviderSection({
  keyName,
  keyMasked,
  keyPlaceholder,
  modelName,
  modelDefault,
  modelSuggestions,
}: {
  keyName: string;
  keyMasked: string;
  keyPlaceholder: string;
  modelName: string;
  modelDefault: string;
  modelSuggestions: string[];
}) {
  return (
    <div className="space-y-4">
      <Field
        label="API key"
        hint={
          keyMasked
            ? `A key is saved (${keyMasked}). Leave blank to keep it.`
            : "No key saved yet."
        }
      >
        <input
          name={keyName}
          type="password"
          placeholder={keyPlaceholder}
          autoComplete="off"
          className="input-field"
        />
      </Field>
      <Field label="Model" hint="Free text — newer model IDs work too.">
        <input
          name={modelName}
          defaultValue={modelDefault}
          list={`${modelName}-suggestions`}
          className="input-field"
        />
        <datalist id={`${modelName}-suggestions`}>
          {modelSuggestions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </label>
  );
}
