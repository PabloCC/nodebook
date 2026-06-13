export type Flashcard = { question: string; answer: string };

// Matches one card: **Q: <question>** then A: <answer>, where the answer runs
// to the next question, the next ## heading, or end of input (multi-line OK).
const CARD_RE =
  /\*\*Q:\s*([\s\S]*?)\*\*\s*\n+\s*A:\s*([\s\S]*?)(?=\n\s*\*\*Q:|\n#{1,6}\s|$)/g;

// Mirrors the format produced by the flashcards prompt in src/lib/ai/prompts.ts:
//
//   ## Flashcards
//
//   **Q: <question>**
//   A: <answer>
//
// If a "## Flashcards" heading exists, only that section is parsed; otherwise
// the whole content is scanned so cards survive heading edits.
export function parseFlashcards(content: string): Flashcard[] {
  const heading = /^##\s+flashcards\s*$/im.exec(content);
  let section = content;
  if (heading) {
    const start = heading.index + heading[0].length;
    const rest = content.slice(start);
    const next = /\n#{1,6}\s/.exec(rest);
    section = next ? rest.slice(0, next.index) : rest;
  }

  const cards: Flashcard[] = [];
  for (const match of section.matchAll(CARD_RE)) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) cards.push({ question, answer });
  }
  return cards;
}

export function hasFlashcards(content: string): boolean {
  return parseFlashcards(content).length > 0;
}
