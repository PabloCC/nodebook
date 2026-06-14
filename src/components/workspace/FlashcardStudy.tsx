"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Grade } from "@/lib/srs";
import type { StudyCard } from "@/lib/study-deck";

const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "Again", className: "btn-utility" },
  { grade: "good", label: "Good", className: "btn-secondary" },
  { grade: "easy", label: "Easy", className: "btn-primary" },
];

export function FlashcardStudy({
  cards,
  onGrade,
  onClose,
}: {
  cards: StudyCard[];
  onGrade: (nodeId: string, cardKey: string, grade: Grade) => void;
  onClose: () => void;
}) {
  // The queue is mutable: an "again" card is re-enqueued to resurface this
  // session. `total` is the count of distinct cards for the progress bar.
  const [queue, setQueue] = useState<StudyCard[]>(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(0);
  const [again, setAgain] = useState(0);

  const done = position >= queue.length;
  const card = done ? null : queue[position];

  const flip = useCallback(() => setFlipped(true), []);

  const grade = useCallback(
    (g: Grade) => {
      const current = queue[position];
      if (!current) return;
      onGrade(current.nodeId, current.cardKey, g);
      setGraded((n) => n + 1);
      if (g === "again") {
        setAgain((n) => n + 1);
        // Resurface a few cards later (or at the end of a short queue).
        setQueue((q) => {
          const next = [...q];
          const insertAt = Math.min(q.length, position + 3);
          next.splice(insertAt, 0, current);
          return next;
        });
      }
      setFlipped(false);
      setPosition((p) => p + 1);
    },
    [onGrade, position, queue]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.key === " " || e.key === "Enter") && !done && !flipped) {
        e.preventDefault();
        flip();
      } else if (flipped && !done && (e.key === "1" || e.key === "2" || e.key === "3")) {
        e.preventDefault();
        grade(GRADE_BUTTONS[Number(e.key) - 1].grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, flipped, flip, grade, onClose]);

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
              Reviewed {graded} {graded === 1 ? "card" : "cards"}.
              {again > 0
                ? ` ${again} sent back for another look.`
                : " All scheduled."}
            </p>
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
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
                  {GRADE_BUTTONS.map(({ grade: g, label, className }) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      className={className}
                    >
                      {label}
                    </button>
                  ))}
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
