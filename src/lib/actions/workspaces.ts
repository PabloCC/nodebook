"use server";

import JSZip from "jszip";
import { db } from "@/lib/db";
import { nodes, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseWorkspaceImport, type ImportedNode, type ImportFile } from "@/lib/import";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = formData.get("type") === "course" ? "course" : "study";
  if (!name) return;

  const id = crypto.randomUUID();
  await db.insert(workspaces).values({ id, name, type, createdAt: Date.now() });
  redirect(`/workspace/${id}`);
}

/**
 * Recreates a workspace from a previously-exported markdown zip — the inverse
 * of the export route. Folders become groups, `NN-slug.md` files become nodes
 * (title from the `# ` heading, flashcards from the `## Flashcards` section).
 */
export async function importWorkspace(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const files: ImportFile[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !/\.md$/i.test(entry.name)) continue;
    files.push({ path: entry.name, content: await entry.async("string") });
  }

  const roots = parseWorkspaceImport(files);
  if (roots.length === 0) return; // nothing importable — leave the user on home

  const id = crypto.randomUUID();
  const name = file.name.replace(/\.zip$/i, "").trim() || "Imported workspace";
  const now = Date.now();

  db.transaction((tx) => {
    tx.insert(workspaces)
      .values({ id, name, type: "study", createdAt: now })
      .run();
    const insert = (siblings: ImportedNode[], parentId: string | null) => {
      siblings.forEach((node, position) => {
        const nodeId = crypto.randomUUID();
        tx.insert(nodes)
          .values({
            id: nodeId,
            workspaceId: id,
            parentId,
            title: node.title,
            content: node.content,
            flashcards: node.flashcards,
            position,
            type: node.type,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        if (node.type === "group") insert(node.children, nodeId);
      });
    };
    insert(roots, null);
  });

  redirect(`/workspace/${id}`);
}

export async function renameWorkspace(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.update(workspaces).set({ name: trimmed }).where(eq(workspaces.id, id));
  revalidatePath("/");
  revalidatePath(`/workspace/${id}`);
}

export async function deleteWorkspace(id: string) {
  await db.delete(workspaces).where(eq(workspaces.id, id));
  revalidatePath("/");
}
