"use client";

import type { Icon } from "@phosphor-icons/react";
import type { Source } from "@/lib/db/schema";
import {
  PdfIcon,
  UrlIcon,
  TextIcon,
  DocIcon,
  YoutubeIcon,
} from "@/components/ui/icons";

const TYPE_ICONS: Record<Source["type"], Icon> = {
  pdf: PdfIcon,
  url: UrlIcon,
  text: TextIcon,
  docx: DocIcon,
  youtube: YoutubeIcon,
};

export function SourceTypeIcon({
  type,
  className,
}: {
  type: Source["type"];
  className?: string;
}) {
  const Glyph = TYPE_ICONS[type];
  return <Glyph className={className} weight="bold" aria-hidden />;
}

export function SourceViewerDialog({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-2xl border border-hairline bg-canvas p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-6">
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
