import { describe, it, expect } from "vitest";
import { parseFlashcards, hasFlashcards } from "@/lib/flashcards";

// This fixture is exactly the format src/lib/ai/prompts.ts asks the model to
// produce — keep it in sync with that prompt so parser and generator align.
const GENERATED = `## Flashcards

**Q: What is a closure?**
A: A function bundled with references to its surrounding state.

**Q: What does \`map\` return?**
A: A new array with the callback applied to each element.`;

describe("parseFlashcards", () => {
  it("parses the canonical generated block into ordered cards", () => {
    expect(parseFlashcards(GENERATED)).toEqual([
      {
        question: "What is a closure?",
        answer: "A function bundled with references to its surrounding state.",
      },
      {
        question: "What does `map` return?",
        answer: "A new array with the callback applied to each element.",
      },
    ]);
  });

  it("captures a multi-line answer in full", () => {
    const content = `## Flashcards

**Q: Name the three states.**
A: They are:
- pending
- ready
- error`;
    expect(parseFlashcards(content)).toEqual([
      {
        question: "Name the three states.",
        answer: "They are:\n- pending\n- ready\n- error",
      },
    ]);
  });

  it("ignores prose above the Flashcards section", () => {
    const content = `# Loops

Loops repeat work. **Q:** style text in prose should not match without an answer.

## Flashcards

**Q: What is iteration?**
A: Repeating a block of code.`;
    expect(parseFlashcards(content)).toEqual([
      { question: "What is iteration?", answer: "Repeating a block of code." },
    ]);
  });

  it("stops at the next heading after the Flashcards section", () => {
    const content = `## Flashcards

**Q: First?**
A: Yes.

## Notes

**Q: Should this match?**
A: No, it is past the section.`;
    expect(parseFlashcards(content)).toEqual([
      { question: "First?", answer: "Yes." },
    ]);
  });

  it("parses cards even without the heading", () => {
    const content = `**Q: Standalone?**
A: Works without a heading.`;
    expect(parseFlashcards(content)).toEqual([
      { question: "Standalone?", answer: "Works without a heading." },
    ]);
  });

  it("returns [] for empty content or content with no cards", () => {
    expect(parseFlashcards("")).toEqual([]);
    expect(parseFlashcards("# Title\n\nJust prose, no cards.")).toEqual([]);
  });

  it("skips a dangling question with no answer without throwing", () => {
    const content = `## Flashcards

**Q: This one is complete?**
A: Yes.

**Q: This one has no answer**`;
    expect(parseFlashcards(content)).toEqual([
      { question: "This one is complete?", answer: "Yes." },
    ]);
  });
});

describe("hasFlashcards", () => {
  it("reflects whether any card parses", () => {
    expect(hasFlashcards(GENERATED)).toBe(true);
    expect(hasFlashcards("no cards here")).toBe(false);
  });
});
