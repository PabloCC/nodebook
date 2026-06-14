import { describe, it, expect } from "vitest";
import { cardKey, computeNext, initialReview, isDue, type ReviewState } from "./srs";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("cardKey", () => {
  it("is stable across whitespace and case differences", () => {
    expect(cardKey("What is a closure?")).toBe(cardKey("  what  is a CLOSURE? "));
  });

  it("differs for different questions", () => {
    expect(cardKey("What is a closure?")).not.toBe(cardKey("What is hoisting?"));
  });
});

describe("isDue", () => {
  it("treats a missing state as due (new card)", () => {
    expect(isDue(undefined, NOW)).toBe(true);
  });

  it("is due when the due time has passed, not before", () => {
    const future: ReviewState = { ...initialReview(NOW), due: NOW + DAY };
    expect(isDue(future, NOW)).toBe(false);
    expect(isDue(future, NOW + DAY)).toBe(true);
  });
});

describe("computeNext", () => {
  it("grows the interval on successive 'good' grades (1d → 4d → spaced)", () => {
    const s0 = initialReview(NOW);
    const s1 = computeNext(s0, "good", NOW);
    expect(s1.interval).toBe(1);
    expect(s1.reps).toBe(1);
    expect(s1.due).toBe(NOW + DAY);

    const s2 = computeNext(s1, "good", NOW);
    expect(s2.interval).toBe(4);
    expect(s2.reps).toBe(2);

    const s3 = computeNext(s2, "good", NOW);
    // interval * ease (2.5) ≈ 10
    expect(s3.interval).toBeGreaterThan(s2.interval);
  });

  it("'again' resets the schedule, drops ease (floored at 1.3), and resurfaces soon", () => {
    const learned: ReviewState = {
      ease: 1.4,
      interval: 10,
      reps: 3,
      due: NOW,
      lastReviewed: NOW,
    };
    const next = computeNext(learned, "again", NOW);
    expect(next.interval).toBe(0);
    expect(next.reps).toBe(0);
    expect(next.ease).toBe(1.3); // max(1.3, 1.4 - 0.2)
    expect(next.due).toBeGreaterThan(NOW);
    expect(next.due).toBeLessThan(NOW + DAY);
  });

  it("'easy' schedules further out than 'good' and raises ease", () => {
    const s0 = initialReview(NOW);
    const good = computeNext(s0, "good", NOW);
    const easy = computeNext(s0, "easy", NOW);
    expect(easy.interval).toBeGreaterThan(good.interval);
    expect(easy.ease).toBeGreaterThan(s0.ease);
  });
});
