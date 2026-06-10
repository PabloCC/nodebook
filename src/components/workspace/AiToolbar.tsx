"use client";

import { useState } from "react";
import type { NodeAction } from "@/lib/ai/prompts";

const ACTION_BUTTONS: { action: NodeAction; label: string }[] = [
  { action: "expand", label: "Expand" },
  { action: "rewrite", label: "Rewrite" },
  { action: "summarize", label: "Summarize" },
  { action: "flashcards", label: "Flashcards" },
];

export function AiToolbar({
  streaming,
  error,
  onRun,
  onStop,
}: {
  streaming: boolean;
  error: string | null;
  onRun: (action: NodeAction, question?: string) => void;
  onStop: () => void;
}) {
  const [question, setQuestion] = useState("");

  return (
    <div className="border-t border-neutral-200 pt-3">
      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {ACTION_BUTTONS.map(({ action, label }) => (
          <button
            key={action}
            onClick={() => onRun(action)}
            disabled={streaming}
            className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
        {streaming && (
          <button
            onClick={onStop}
            className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            ■ Stop
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!question.trim()) return;
            onRun("ask", question);
            setQuestion("");
          }}
          className="flex min-w-48 flex-1 gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this topic…"
            disabled={streaming}
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-transparent px-2.5 py-1.5 text-xs outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !question.trim()}
            className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-50"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
