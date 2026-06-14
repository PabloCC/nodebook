/**
 * Lightweight spaced-repetition scheduler (SM-2-lite) plus stable card identity.
 *
 * Pure and dependency-free so it runs on both client and server. Flashcards
 * have no stored id — they're parsed from node markdown by order and decks are
 * regenerated wholesale — so review state is keyed by a hash of the question
 * text (`cardKey`), which survives reordering and partial regeneration.
 */

export type Grade = "again" | "good" | "easy";

export type ReviewState = {
  /** SM-2 ease factor; floor 1.3. */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Number of successful reviews in a row. */
  reps: number;
  /** When the card is next due (epoch ms). */
  due: number;
  /** Last time it was graded (epoch ms), or null if never. */
  lastReviewed: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

/** State for a card that has never been reviewed: due immediately. */
export function initialReview(now: number = Date.now()): ReviewState {
  return { ease: 2.5, interval: 0, reps: 0, due: now, lastReviewed: null };
}

/** A card with no persisted state, or whose due time has passed, is due. */
export function isDue(state: ReviewState | undefined, now: number = Date.now()) {
  return !state || state.due <= now;
}

/**
 * Stable identity for a card, derived from its question text. Normalizes
 * whitespace/case, then FNV-1a → base36. Edits to the question mint a new key
 * (fresh state); reordering or regenerating other cards leaves it untouched.
 */
export function cardKey(question: string): string {
  const normalized = question.trim().replace(/\s+/g, " ").toLowerCase();
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    // multiply by the FNV prime (16777619), kept in 32-bit range
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Advance a card's schedule given a grade. */
export function computeNext(
  state: ReviewState,
  grade: Grade,
  now: number = Date.now()
): ReviewState {
  if (grade === "again") {
    return {
      ease: Math.max(MIN_EASE, state.ease - 0.2),
      interval: 0,
      reps: 0,
      // Resurface within the same session / shortly after.
      due: now + 60 * 1000,
      lastReviewed: now,
    };
  }

  const ease =
    grade === "easy" ? state.ease + 0.15 : Math.max(MIN_EASE, state.ease);

  let interval: number;
  if (state.reps === 0) {
    interval = grade === "easy" ? 3 : 1;
  } else if (state.reps === 1) {
    interval = grade === "easy" ? 6 : 4;
  } else {
    interval = Math.round(state.interval * ease * (grade === "easy" ? 1.3 : 1));
  }
  interval = Math.max(1, interval);

  return {
    ease,
    interval,
    reps: state.reps + 1,
    due: now + interval * DAY_MS,
    lastReviewed: now,
  };
}
