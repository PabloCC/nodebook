import { parseFlashcards } from "./flashcards";
import { cardKey, isDue, type ReviewState } from "./srs";

export type StudyCard = {
  nodeId: string;
  cardKey: string;
  question: string;
  answer: string;
};

type NodeLike = { id: string; flashcards: string };
type Reviews = Record<string, ReviewState> | undefined;

/** Parse a node's flashcard markdown into identified study cards. */
export function nodeCards(node: NodeLike): StudyCard[] {
  return parseFlashcards(node.flashcards).map((c) => ({
    nodeId: node.id,
    cardKey: cardKey(c.question),
    question: c.question,
    answer: c.answer,
  }));
}

/** How many of a node's cards are due (new cards count as due). */
export function dueCount(
  node: NodeLike,
  reviews: Reviews,
  now: number = Date.now()
): number {
  return nodeCards(node).reduce(
    (n, c) => n + (isDue(reviews?.[c.cardKey], now) ? 1 : 0),
    0
  );
}

// Sort by due time ascending; cards with no state (new) sort first.
function byDue(reviewsFor: (c: StudyCard) => ReviewState | undefined) {
  return (a: StudyCard, b: StudyCard) =>
    (reviewsFor(a)?.due ?? 0) - (reviewsFor(b)?.due ?? 0);
}

/** A single node's full deck, ordered due-first. */
export function nodeDeck(
  node: NodeLike,
  reviews: Reviews
): StudyCard[] {
  return [...nodeCards(node)].sort(byDue((c) => reviews?.[c.cardKey]));
}

/** Cards due across the whole workspace, ordered due-first. */
export function workspaceDueDeck(
  nodes: NodeLike[],
  reviewMap: Record<string, Record<string, ReviewState>>,
  now: number = Date.now()
): StudyCard[] {
  const due = nodes
    .flatMap((node) => nodeCards(node))
    .filter((c) => isDue(reviewMap[c.nodeId]?.[c.cardKey], now));
  return due.sort(byDue((c) => reviewMap[c.nodeId]?.[c.cardKey]));
}
