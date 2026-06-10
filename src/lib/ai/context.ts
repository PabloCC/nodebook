import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, sources } from "@/lib/db/schema";
import { siblingTitles } from "@/lib/tree";

// ~50K tokens — fits the common context windows of all three providers.
const CONTEXT_CHAR_BUDGET = 200_000;
const TRUNCATION_MARKER = "\n[...truncated]";

export async function buildSourceContext(
  workspaceId: string
): Promise<string> {
  const ready = await db
    .select()
    .from(sources)
    .where(
      and(eq(sources.workspaceId, workspaceId), eq(sources.status, "ready"))
    );
  if (ready.length === 0) return "";

  const total = ready.reduce((sum, s) => sum + s.content.length, 0);

  return ready
    .map((source) => {
      let content = source.content;
      if (total > CONTEXT_CHAR_BUDGET) {
        // Shrink each source proportionally to its share of the total.
        const budget = Math.max(
          500,
          Math.floor((CONTEXT_CHAR_BUDGET * content.length) / total)
        );
        if (content.length > budget) {
          content = content.slice(0, budget) + TRUNCATION_MARKER;
        }
      }
      return `<source title="${source.title.replaceAll('"', "'")}" type="${source.type}">\n${content}\n</source>`;
    })
    .join("\n\n");
}

export async function buildNodeContext(workspaceId: string, nodeId: string) {
  const allNodes = await db
    .select()
    .from(nodes)
    .where(eq(nodes.workspaceId, workspaceId));
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const parent = node.parentId
    ? allNodes.find((n) => n.id === node.parentId)
    : null;

  return {
    title: node.title,
    content: node.content,
    groupTitle: parent?.title ?? null,
    siblingTitles: siblingTitles(allNodes, nodeId),
  };
}
