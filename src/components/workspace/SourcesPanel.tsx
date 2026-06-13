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
import type { Icon } from "@phosphor-icons/react";
import {
  PdfIcon,
  UrlIcon,
  TextIcon,
  AddIcon,
  CloseIcon,
} from "@/components/ui/icons";

const TYPE_ICONS: Record<Source["type"], Icon> = {
  pdf: PdfIcon,
  url: UrlIcon,
  text: TextIcon,
};

function SourceTypeIcon({
  type,
  className,
}: {
  type: Source["type"];
  className?: string;
}) {
  const Glyph = TYPE_ICONS[type];
  return <Glyph className={className} weight="bold" aria-hidden />;
}

type AddMode = null | "text" | "url";

export function SourcesPanel({
  workspaceId,
  sources,
}: {
  workspaceId: string;
  sources: Source[];
}) {
  const [mode, setMode] = useState<AddMode>(null);
  const [viewing, setViewing] = useState<Source | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3">
        <h2 className="badge text-muted">Sources</h2>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2">
        {sources.length === 0 ? (
          <p className="px-1 py-4 text-sm leading-relaxed text-muted">
            No sources yet. Add a PDF, URL, or text to ground the AI.
          </p>
        ) : (
          <ul className="space-y-1">
            {sources.map((source) => (
              <li
                key={source.id}
                className="group rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-card"
              >
                <div className="flex items-center gap-2">
                  <SourceTypeIcon
                    type={source.type}
                    className="h-4 w-4 shrink-0 text-muted"
                  />
                  {source.status === "ready" ? (
                    <button
                      onClick={() => setViewing(source)}
                      title={source.title}
                      className="min-w-0 flex-1 cursor-pointer truncate text-left hover:underline"
                    >
                      {source.title}
                    </button>
                  ) : (
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={source.title}
                    >
                      {source.title}
                    </span>
                  )}
                  <StatusBadge status={source.status} />
                  <ConfirmButton
                    title="Delete source?"
                    message={`"${source.title}" will be removed from this workspace.`}
                    onConfirm={deleteSource.bind(null, source.id)}
                    className="hidden shrink-0 rounded-md p-1 text-muted transition-colors hover:text-error group-hover:block"
                  >
                    <CloseIcon className="h-3.5 w-3.5" weight="bold" />
                  </ConfirmButton>
                </div>
                {source.status === "error" && source.errorMessage && (
                  <p className="mt-1 pl-6 text-xs text-error">
                    {source.errorMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-hairline p-2">
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
              className="btn-utility flex-1"
            >
              <AddIcon className="h-3.5 w-3.5" weight="bold" />
              PDF
            </button>
            <button
              onClick={() => setMode("url")}
              className="btn-utility flex-1"
            >
              <AddIcon className="h-3.5 w-3.5" weight="bold" />
              URL
            </button>
            <button
              onClick={() => setMode("text")}
              className="btn-utility flex-1"
            >
              <AddIcon className="h-3.5 w-3.5" weight="bold" />
              Text
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
          <p className="mt-2 text-center text-xs text-muted">
            Processing source…
          </p>
        )}
      </div>

      <SourceViewerDialog source={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function SourceViewerDialog({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-hairline bg-canvas p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2">
          <SourceTypeIcon
            type={source.type}
            className="h-5 w-5 shrink-0 text-muted"
          />
          <h2
            className="min-w-0 flex-1 truncate font-display text-lg text-ink"
            title={source.title}
          >
            {source.title}
          </h2>
          <button onClick={onClose} className="btn-secondary shrink-0">
            Close
          </button>
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 text-xs text-muted">
          {source.type === "url" && source.originalRef && (
            <a
              href={source.originalRef}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 max-w-full truncate hover:underline"
            >
              {source.originalRef}
            </a>
          )}
          <span className="shrink-0">
            {source.content.length.toLocaleString()} chars
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          This is the extracted text the AI uses as grounding.
        </p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
          {source.content ? (
            source.content
          ) : (
            <span className="text-muted">No text was extracted.</span>
          )}
        </div>
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
        className="input-field px-3 py-1.5 text-xs"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or write text…"
        rows={5}
        className="input-area resize-none px-3 py-1.5 text-xs"
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
        className="input-field px-3 py-1.5 text-xs"
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
        className="btn-primary flex-1 px-2 py-1.5 text-xs"
      >
        Add
      </button>
      <button
        onClick={onCancel}
        className="btn-secondary px-3 py-1.5 text-xs"
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
      className={`badge shrink-0 ${
        status === "processing"
          ? "bg-surface-card text-muted"
          : "bg-error/10 text-error"
      }`}
    >
      {status === "processing" ? "Processing" : "Error"}
    </span>
  );
}
