import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
};

// FTS5 throws on raw user input (unbalanced quotes, operators, trailing
// `*`). Quote every token; star the last one for as-you-type prefix search.
export function toFtsMatchQuery(input: string): string | null {
  const tokens = input
    .split(/\s+/)
    .map((t) => t.replaceAll('"', ""))
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens
    .map((t, i) => (i === tokens.length - 1 ? `"${t}"*` : `"${t}"`))
    .join(" ");
}

export async function searchNodes(
  workspaceId: string,
  query: string
): Promise<SearchResult[]> {
  const match = toFtsMatchQuery(query);
  if (!match) return [];

  // Raw SQL: FTS5 MATCH and snippet() aren't expressible in the query
  // builder. The inner join on nodes guarantees deleted nodes never surface
  // even if an fts row is stale. Snippet match markers are the control chars
  // / (char(1)/char(2)) — SearchBox.tsx splits on the same chars
  // to render highlights, and node text can never collide with or inject them.
  return db.all<SearchResult>(sql`
    SELECT n.id AS id, n.title AS title,
           snippet(nodes_fts, 3, char(1), char(2), '…', 12) AS snippet
    FROM nodes_fts
    JOIN nodes n ON n.id = nodes_fts.id
    WHERE nodes_fts MATCH ${match} AND nodes_fts.workspace_id = ${workspaceId}
    ORDER BY rank
    LIMIT 20
  `);
}
