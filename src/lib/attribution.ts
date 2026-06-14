import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, nodeSources } from "@/lib/db/schema";

/**
 * Maps each node in a workspace to the ids of the sources that informed it.
 * Nodes with no attribution are simply absent from the map.
 */
export async function getNodeSourceMap(
  workspaceId: string
): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ nodeId: nodeSources.nodeId, sourceId: nodeSources.sourceId })
    .from(nodeSources)
    .innerJoin(nodes, eq(nodeSources.nodeId, nodes.id))
    .where(eq(nodes.workspaceId, workspaceId));

  const map: Record<string, string[]> = {};
  for (const { nodeId, sourceId } of rows) {
    (map[nodeId] ??= []).push(sourceId);
  }
  return map;
}
