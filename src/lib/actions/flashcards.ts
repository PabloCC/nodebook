"use server";

import { db } from "@/lib/db";
import { flashcardReviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNext, initialReview, type Grade, type ReviewState } from "@/lib/srs";

const GRADES: Grade[] = ["again", "good", "easy"];

/**
 * Records a grade for one card and advances its schedule. Loads the existing
 * row (or starts fresh), computes the next state, and upserts it. No revalidate
 * — this fires per card during a session; the outline refreshes on close via
 * `refreshWorkspaceReviews`.
 */
export async function recordReview(
  nodeId: string,
  cardKey: string,
  grade: Grade
) {
  if (!nodeId || !cardKey || !GRADES.includes(grade)) return;

  const now = Date.now();
  const [existing] = await db
    .select()
    .from(flashcardReviews)
    .where(
      and(
        eq(flashcardReviews.nodeId, nodeId),
        eq(flashcardReviews.cardKey, cardKey)
      )
    );

  const prev: ReviewState = existing
    ? {
        ease: existing.ease,
        interval: existing.interval,
        reps: existing.reps,
        due: existing.due,
        lastReviewed: existing.lastReviewed,
      }
    : initialReview(now);

  const next = computeNext(prev, grade, now);

  // The node may have been deleted mid-session; the FK guards against orphans.
  try {
    await db
      .insert(flashcardReviews)
      .values({ nodeId, cardKey, ...next })
      .onConflictDoUpdate({
        target: [flashcardReviews.nodeId, flashcardReviews.cardKey],
        set: next,
      });
  } catch {
    // node gone — nothing to record.
  }
}

/** Refresh due counts after a study session closes. */
export async function refreshWorkspaceReviews(workspaceId: string) {
  revalidatePath(`/workspace/${workspaceId}`);
}
