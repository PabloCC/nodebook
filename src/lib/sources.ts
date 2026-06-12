import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";

// Extraction is synchronous and bounded (URL fetches time out at 20s), so a
// "processing" row this old means the process died mid-extraction.
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export async function reconcileStaleSources(workspaceId: string) {
  await db
    .update(sources)
    .set({
      status: "error",
      errorMessage:
        "Processing was interrupted (the app stopped mid-extraction). Delete this source and add it again.",
    })
    .where(
      and(
        eq(sources.workspaceId, workspaceId),
        eq(sources.status, "processing"),
        lt(sources.createdAt, Date.now() - STALE_PROCESSING_MS)
      )
    );
}
