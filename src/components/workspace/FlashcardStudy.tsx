"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Flashcard } from "@/lib/flashcards";

function shuffled(indices: number[]): number[] {
  const out = [...indices];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function FlashcardStudy({
  cards,
  onClose,
}: {
  cards: Flashcard[];
  onClose: () => void;
}) {
  const allIndices = useMemo(() => cards.map((_, i) => i), [cards]);
  const [queue, setQueue] = useState<number[]>(() => shuffled(allIndices));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Set<number>>(new Set());

  const done = position >= queue.length;
  const card = done ? null : cards[queue[position]];

  const flip = useCallback(() => setFlipped(true), []);

  const advance = (didMiss: boolean) => {
    setMissed((prev) => {
      if (!didMiss) return prev;
      const next = new Set(prev);
      next.add(queue[position]);
      return next;
    });
    setFlipped(false);
    setPosition((p) => p + 1);
  };

  const restart = (indices: number[]) => {
    setQueue(shuffled(indices));
    setPosition(0);
    setFlipped(false);
    setMissed(new Set());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.key === " " || e.key === "Enter") && !done && !flipped) {
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, flipped, flip, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-hairline bg-canvas p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 font-display text-lg text-ink">
            {done ? "Review complete" : `Card ${position + 1} of ${queue.length}`}
          </h2>
          <button onClick={onClose} className="btn-secondary shrink-0">
            Close
          </button>
        </div>

        {!done && (
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-card">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(position / queue.length) * 100}%` }}
            />
          </div>
        )}

        {done ? (
          <div className="mt-6 flex flex-col items-center gap-5 py-6 text-center">
            <p className="text-sm text-muted">
              Reviewed {queue.length} {queue.length === 1 ? "card" : "cards"}.
              {missed.size > 0
                ? ` ${missed.size} marked for review.`
                : " All marked as known."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {missed.size > 0 && (
                <button
                  onClick={() => restart([...missed])}
                  className="btn-primary"
                >
                  Review missed ({missed.size})
                </button>
              )}
              <button
                onClick={() => restart(allIndices)}
                className="btn-secondary"
              >
                Study again
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => !flipped && flip()}
              className="mt-4 min-h-0 flex-1 cursor-pointer overflow-y-auto rounded-xl border border-hairline bg-surface-soft p-6 text-left"
              aria-label={flipped ? "Answer" : "Question — click to reveal answer"}
            >
              <span className="badge mb-2 block text-muted">
                {flipped ? "Answer" : "Question"}
              </span>
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {flipped ? card!.answer : card!.question}
                </ReactMarkdown>
              </div>
            </button>

            <div className="mt-4 flex shrink-0 flex-col items-center gap-2">
              {flipped ? (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => advance(false)}
                    className="btn-secondary"
                  >
                    Got it
                  </button>
                  <button
                    onClick={() => advance(true)}
                    className="btn-utility"
                  >
                    Need review
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={flip} className="btn-primary">
                    Show answer
                  </button>
                  <p className="text-xs text-muted-soft">
                    Press <kbd>Space</kbd> to flip
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
