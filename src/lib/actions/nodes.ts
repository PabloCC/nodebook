"use server";

import { db } from "@/lib/db";
import { nodes } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  outlineProposalSchema,
  type OutlineProposal,
} from "@/lib/ai/outline-schema";

function siblingFilter(workspaceId: string, parentId: string | null) {
  return and(
    eq(nodes.workspaceId, workspaceId),
    parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId)
  );
}

export async function createNode(
  workspaceId: string,
  parentId: string | null,
  type: "group" | "node",
  title?: string
) {
  const [{ max }] = await db
    .select({ max: sql<number | null>`max(${nodes.position})` })
    .from(nodes)
    .where(siblingFilter(workspaceId, parentId));

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(nodes).values({
    id,
    workspaceId,
    parentId,
    title: title ?? (type === "group" ? "New group" : "New node"),
    content: "",
    position: (max ?? -1) + 1,
    type,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath(`/workspace/${workspaceId}`);
  return id;
}

export async function renameNode(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const [node] = await db
    .update(nodes)
    .set({ title: trimmed, updatedAt: Date.now() })
    .where(eq(nodes.id, id))
    .returning({ workspaceId: nodes.workspaceId });
  if (node) revalidatePath(`/workspace/${node.workspaceId}`);
}

export async function updateNodeContent(id: string, content: string) {
  const [node] = await db
    .update(nodes)
    .set({ content, updatedAt: Date.now() })
    .where(eq(nodes.id, id))
    .returning({ workspaceId: nodes.workspaceId });
  if (node) revalidatePath(`/workspace/${node.workspaceId}`);
}

export async function moveNode(
  nodeId: string,
  newParentId: string | null,
  newIndex: number
) {
  const all = await db.select().from(nodes);
  const node = all.find((n) => n.id === nodeId);
  if (!node) return;

  if (newParentId !== null) {
    const parent = all.find((n) => n.id === newParentId);
    if (
      !parent ||
      parent.workspaceId !== node.workspaceId ||
      parent.type !== "group"
    ) {
      return;
    }
    // Cycle guard: the new parent must not be the node itself or a descendant.
    for (
      let cursor: typeof parent | undefined = parent;
      cursor;
      cursor = all.find((n) => n.id === cursor!.parentId)
    ) {
      if (cursor.id === nodeId) return;
    }
  }

  const byPosition = (a: { position: number }, b: { position: number }) =>
    a.position - b.position;
  const oldSiblings = all
    .filter(
      (n) =>
        n.workspaceId === node.workspaceId &&
        n.parentId === node.parentId &&
        n.id !== nodeId
    )
    .sort(byPosition);
  const newSiblings =
    newParentId === node.parentId
      ? [...oldSiblings]
      : all
          .filter(
            (n) =>
              n.workspaceId === node.workspaceId &&
              n.parentId === newParentId &&
              n.id !== nodeId
          )
          .sort(byPosition);

  const insertAt = Math.max(0, Math.min(newIndex, newSiblings.length));
  newSiblings.splice(insertAt, 0, node);

  db.transaction((tx) => {
    tx.update(nodes)
      .set({ parentId: newParentId, updatedAt: Date.now() })
      .where(eq(nodes.id, nodeId))
      .run();
    if (newParentId !== node.parentId) {
      oldSiblings.forEach((sibling, index) => {
        if (sibling.position !== index) {
          tx.update(nodes)
            .set({ position: index })
            .where(eq(nodes.id, sibling.id))
            .run();
        }
      });
    }
    newSiblings.forEach((sibling, index) => {
      if (sibling.position !== index || sibling.id === nodeId) {
        tx.update(nodes)
          .set({ position: index })
          .where(eq(nodes.id, sibling.id))
          .run();
      }
    });
  });

  revalidatePath(`/workspace/${node.workspaceId}`);
}

export async function applyOutline(
  workspaceId: string,
  proposal: OutlineProposal
) {
  const parsed = outlineProposalSchema.parse(proposal);

  const [{ max }] = await db
    .select({ max: sql<number | null>`max(${nodes.position})` })
    .from(nodes)
    .where(siblingFilter(workspaceId, null));
  let rootPosition = (max ?? -1) + 1;
  const now = Date.now();

  db.transaction((tx) => {
    for (const group of parsed.groups) {
      const groupId = crypto.randomUUID();
      tx.insert(nodes)
        .values({
          id: groupId,
          workspaceId,
          parentId: null,
          title: group.title,
          content: "",
          position: rootPosition++,
          type: "group",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      group.nodes.forEach((node, index) => {
        tx.insert(nodes)
          .values({
            id: crypto.randomUUID(),
            workspaceId,
            parentId: groupId,
            title: node.title,
            content: node.summary,
            position: index,
            type: "node",
            createdAt: now,
            updatedAt: now,
          })
          .run();
      });
    }
  });

  revalidatePath(`/workspace/${workspaceId}`);
}

export async function deleteNode(id: string) {
  const [node] = await db
    .delete(nodes)
    .where(eq(nodes.id, id))
    .returning({ workspaceId: nodes.workspaceId });
  if (node) revalidatePath(`/workspace/${node.workspaceId}`);
}
