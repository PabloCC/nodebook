import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, flashcardReviews } from "@/lib/db/schema";
import type { ReviewState } from "@/lib/srs";

/**
 * All persisted flashcard review state for a workspace, grouped by node and
 * keyed by `cardKey`. Cards with no row simply won't appear (treated as new).
 */
export async function getWorkspaceReviews(
  workspaceId: string
): Promise<Record<string, Record<string, ReviewState>>> {
  const rows = await db
    .select({
      nodeId: flashcardReviews.nodeId,
      cardKey: flashcardReviews.cardKey,
      ease: flashcardReviews.ease,
      interval: flashcardReviews.interval,
      reps: flashcardReviews.reps,
      due: flashcardReviews.due,
      lastReviewed: flashcardReviews.lastReviewed,
    })
    .from(flashcardReviews)
    .innerJoin(nodes, eq(flashcardReviews.nodeId, nodes.id))
    .where(eq(nodes.workspaceId, workspaceId));

  const map: Record<string, Record<string, ReviewState>> = {};
  for (const { nodeId, cardKey, ease, interval, reps, due, lastReviewed } of rows) {
    (map[nodeId] ??= {})[cardKey] = { ease, interval, reps, due, lastReviewed };
  }
  return map;
}
