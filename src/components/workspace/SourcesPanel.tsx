"use client";

import { useRef, useState, useTransition } from "react";
import type { Source } from "@/lib/db/schema";
import {
  addPdfSource,
  addTextSource,
  addUrlSource,
  deleteSource,
} from "@/lib/actions/sources";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";

const TYPE_ICONS: Record<Source["type"], string> = {
  pdf: "📄",
  url: "🔗",
  text: "📝",
};

type AddMode = null | "text" | "url";

export function SourcesPanel({
  workspaceId,
  sources,
}: {
  workspaceId: string;
  sources: Source[];
}) {
  const [mode, setMode] = useState<AddMode>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Sources
        </h2>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2">
        {sources.length === 0 ? (
          <p className="px-1 py-4 text-sm text-neutral-500">
            No sources yet. Add a PDF, URL, or text to ground the AI.
          </p>
        ) : (
          <ul className="space-y-1">
            {sources.map((source) => (
              <li
                key={source.id}
                className="group rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100"
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">{TYPE_ICONS[source.type]}</span>
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={source.title}
                  >
                    {source.title}
                  </span>
                  <StatusBadge status={source.status} />
                  <ConfirmButton
                    title="Delete source?"
                    message={`"${source.title}" will be removed from this workspace.`}
                    onConfirm={deleteSource.bind(null, source.id)}
                    className="hidden shrink-0 rounded px-1 text-neutral-400 hover:text-red-600 group-hover:block"
                  >
                    ×
                  </ConfirmButton>
                </div>
                {source.status === "error" && source.errorMessage && (
                  <p className="mt-1 pl-6 text-xs text-red-600">
                    {source.errorMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-neutral-200 p-2">
        {mode === "text" && (
          <TextForm
            pending={pending}
            onSubmit={(title, text) => {
              setMode(null);
              startTransition(() => addTextSource(workspaceId, title, text));
            }}
            onCancel={() => setMode(null)}
          />
        )}
        {mode === "url" && (
          <UrlForm
            pending={pending}
            onSubmit={(url) => {
              setMode(null);
              startTransition(() => addUrlSource(workspaceId, url));
            }}
            onCancel={() => setMode(null)}
          />
        )}
        {mode === null && (
          <div className="flex gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={pending}
              className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-50"
            >
              + PDF
            </button>
            <button
              onClick={() => setMode("url")}
              className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-100"
            >
              + URL
            </button>
            <button
              onClick={() => setMode("text")}
              className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-100"
            >
              + Text
            </button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const formData = new FormData();
            formData.set("file", file);
            startTransition(() => addPdfSource(workspaceId, formData));
          }}
        />
        {pending && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Processing source…
          </p>
        )}
      </div>
    </div>
  );
}

function TextForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (title: string, text: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-xs outline-none"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or write text…"
        rows={5}
        className="w-full resize-none rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-xs outline-none"
      />
      <FormButtons
        disabled={pending || !text.trim()}
        onSubmit={() => onSubmit(title, text)}
        onCancel={onCancel}
      />
    </div>
  );
}

function UrlForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        type="url"
        className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-xs outline-none"
      />
      <FormButtons
        disabled={pending || !url.trim()}
        onSubmit={() => onSubmit(url)}
        onCancel={onCancel}
      />
    </div>
  );
}

function FormButtons({
  disabled,
  onSubmit,
  onCancel,
}: {
  disabled: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="flex-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        Add
      </button>
      <button
        onClick={onCancel}
        className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-100"
      >
        Cancel
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: Source["status"] }) {
  if (status === "ready") return null;
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        status === "processing"
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status === "processing" ? "processing" : "error"}
    </span>
  );
}
