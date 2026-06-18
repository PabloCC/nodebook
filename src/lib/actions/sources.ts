"use server";

import { db } from "@/lib/db";
import { sources, type Source } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { extractPdfText } from "@/lib/extract/pdf";
import { extractUrlText } from "@/lib/extract/url";
import { extractDocxText } from "@/lib/extract/docx";
import { extractYoutubeTranscript } from "@/lib/extract/youtube";

async function insertSource(values: {
  workspaceId: string;
  type: Source["type"];
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

export async function addDocxSource(workspaceId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const id = await insertSource({
    workspaceId,
    type: "docx",
    title: file.name,
    originalRef: file.name,
  });
  await finishSource(id, workspaceId, async () => ({
    content: await extractDocxText(await file.arrayBuffer()),
  }));
}

// Plain-text / markdown file upload — stored as a `text` source (so it behaves
// like pasted text everywhere, including export/import).
export async function addTextFileSource(
  workspaceId: string,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const id = await insertSource({
    workspaceId,
    type: "text",
    title: file.name,
    originalRef: null,
  });
  await finishSource(id, workspaceId, async () => {
    const content = (await file.text()).trim();
    if (!content) throw new Error("This file is empty");
    return { content };
  });
}

export async function addYoutubeSource(workspaceId: string, url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const id = await insertSource({
    workspaceId,
    type: "youtube",
    title: trimmed,
    originalRef: trimmed,
  });
  await finishSource(id, workspaceId, async () => {
    const { title, text } = await extractYoutubeTranscript(trimmed);
    return { content: text, title };
  });
}

/**
 * Re-runs extraction for an errored source. Only URL and YouTube sources are
 * recoverable — we keep their `originalRef`. PDF/docx bytes and pasted/uploaded
 * text aren't stored, so those keep the "delete and add again" path.
 */
export async function retrySource(id: string) {
  const [source] = await db.select().from(sources).where(eq(sources.id, id));
  if (
    !source ||
    !source.originalRef ||
    (source.type !== "url" && source.type !== "youtube")
  ) {
    return;
  }

  await db
    .update(sources)
    .set({ status: "processing", errorMessage: null })
    .where(eq(sources.id, id));
  revalidatePath(`/workspace/${source.workspaceId}`);

  const ref = source.originalRef;
  const type = source.type;
  await finishSource(id, source.workspaceId, async () => {
    const { title, text } =
      type === "youtube"
        ? await extractYoutubeTranscript(ref)
        : await extractUrlText(ref);
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
