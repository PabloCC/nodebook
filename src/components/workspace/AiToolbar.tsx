"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NodeAction } from "@/lib/ai/prompts";

const ACTION_BUTTONS: {
  action: NodeAction;
  label: string;
  icon: string;
  className: string;
}[] = [
  { action: "expand", label: "Expand", icon: "✦", className: "btn-action-expand" },
  { action: "rewrite", label: "Rewrite", icon: "↻", className: "btn-action-rewrite" },
  { action: "summarize", label: "Summarize", icon: "≡", className: "btn-action-summarize" },
  { action: "flashcards", label: "Flashcards", icon: "◳", className: "btn-action-flashcards" },
];

export function AiActionBar({
  disabled,
  onRun,
  cardCount,
  onStudy,
}: {
  disabled: boolean;
  onRun: (action: NodeAction, question?: string) => void;
  cardCount: number;
  onStudy: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-hairline-soft pt-3">
      {ACTION_BUTTONS.map(({ action, label, icon, className }) => (
        <button
          key={action}
          onClick={() => onRun(action)}
          disabled={disabled}
          className={`btn-action ${className}`}
        >
          <span aria-hidden>{icon}</span>
          {label}
        </button>
      ))}
      {cardCount > 0 && (
        <button
          onClick={onStudy}
          disabled={disabled}
          className="btn-action btn-action-flashcards"
        >
          <span aria-hidden>▶</span>
          Study ({cardCount})
        </button>
      )}
    </div>
  );
}

export function AskBar({
  disabled,
  error,
  onAsk,
}: {
  disabled: boolean;
  error: string | null;
  onAsk: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");

  return (
    <div className="border-t border-hairline-soft pt-3">
      {error && <p className="mb-2 text-xs text-error">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          onAsk(question);
          setQuestion("");
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this topic…"
          disabled={disabled}
          className="input-field min-w-0 flex-1 px-3 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={disabled || !question.trim()}
          className="btn-primary px-3.5 py-1.5 text-xs"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

const ACTION_TITLES: Record<NodeAction, string> = {
  expand: "Expand",
  rewrite: "Rewrite",
  summarize: "Summarize",
  flashcards: "Flashcards",
  ask: "Answer",
};

export function ReviewPanel({
  action,
  addLabel,
  text,
  streaming,
  onAdd,
  onDiscard,
  onStop,
}: {
  action: NodeAction;
  addLabel: string;
  text: string;
  streaming: boolean;
  onAdd: () => void;
  onDiscard: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-hairline bg-surface-soft">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="flex-1 text-xs font-semibold text-muted">
          {ACTION_TITLES[action]} · review
        </span>
        {streaming ? (
          <button
            onClick={onStop}
            className="rounded-lg border border-error/40 px-2.5 py-1.5 text-xs font-medium text-error active:bg-error/10"
          >
            ■ Stop
          </button>
        ) : (
          <>
            <button onClick={onDiscard} className="btn-secondary px-3 py-1.5 text-xs">
              Discard
            </button>
            <button
              onClick={onAdd}
              disabled={!text.trim()}
              className="btn-primary px-3.5 py-1.5 text-xs"
            >
              {addLabel}
            </button>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {text.trim() ? (
          <div className="prose prose-neutral max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted">Generating…</p>
        )}
      </div>
    </div>
  );
}
