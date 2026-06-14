"use server";

import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { extractPdfText } from "@/lib/extract/pdf";
import { extractUrlText } from "@/lib/extract/url";

async function insertSource(values: {
  workspaceId: string;
  type: "pdf" | "url" | "text";
  title: string;
  originalRef: string | null;
}) {
  const id = crypto.randomUUID();
  await db.insert(sources).values({
    id,
    ...values,
    content: "",
    status: "processing",
    createdAt: Date.now(),
  });
  return id;
}

async function finishSource(
  id: string,
  workspaceId: string,
  work: () => Promise<{ content: string; title?: string }>
) {
  try {
    const { content, title } = await work();
    await db
      .update(sources)
      .set({ content, status: "ready", ...(title ? { title } : {}) })
      .where(eq(sources.id, id));
  } catch (err) {
    await db
      .update(sources)
      .set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(sources.id, id));
  }
  revalidatePath(`/workspace/${workspaceId}`);
}

export async function addTextSource(
  workspaceId: string,
  title: string,
  text: string
) {
  const content = text.trim();
  if (!content) return;
  const id = await insertSource({
    workspaceId,
    type: "text",
    title: title.trim() || "Pasted text",
    originalRef: null,
  });
  await finishSource(id, workspaceId, async () => ({ content }));
}

export async function addUrlSource(workspaceId: string, url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const id = await insertSource({
    workspaceId,
    type: "url",
    title: trimmed,
    originalRef: trimmed,
  });
  await finishSource(id, workspaceId, async () => {
    const { title, text } = await extractUrlText(trimmed);
    return { content: text, title };
  });
}

export async function addPdfSource(workspaceId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const id = await insertSource({
    workspaceId,
    type: "pdf",
    title: file.name,
    originalRef: file.name,
  });
  await finishSource(id, workspaceId, async () => ({
    content: await extractPdfText(await file.arrayBuffer()),
  }));
}

/**
 * Re-runs extraction for an errored source. Only URL sources are recoverable —
 * we keep their `originalRef`, whereas PDF bytes and pasted text aren't stored,
 * so those keep the "delete and add again" path.
 */
export async function retrySource(id: string) {
  const [source] = await db.select().from(sources).where(eq(sources.id, id));
  if (!source || source.type !== "url" || !source.originalRef) return;

  await db
    .update(sources)
    .set({ status: "processing", errorMessage: null })
    .where(eq(sources.id, id));
  revalidatePath(`/workspace/${source.workspaceId}`);

  const url = source.originalRef;
  await finishSource(id, source.workspaceId, async () => {
    const { title, text } = await extractUrlText(url);
    return { content: text, title };
  });
}

export async function deleteSource(id: string) {
  const [source] = await db
    .delete(sources)
    .where(eq(sources.id, id))
    .returning({ workspaceId: sources.workspaceId });
  if (source) revalidatePath(`/workspace/${source.workspaceId}`);
}
