// NOTE: The raw DDL below mirrors src/lib/db/schema.ts — update both together
// if the workspaces or nodes schema changes. The FTS index itself comes from
// the real ensureSearchIndex, so production and test search schemas can't drift.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const schema = await import("@/lib/db/schema");
  const { ensureSearchIndex } = await import("@/lib/db/search-index");
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE workspaces (
      id text PRIMARY KEY,
      name text NOT NULL,
      type text NOT NULL DEFAULT 'study',
      created_at integer NOT NULL
    );
    CREATE TABLE nodes (
      id text PRIMARY KEY,
      workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      parent_id text REFERENCES nodes(id) ON DELETE CASCADE,
      title text NOT NULL,
      content text NOT NULL DEFAULT '',
      flashcards text NOT NULL DEFAULT '',
      position integer NOT NULL,
      type text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
  `);
  ensureSearchIndex(sqlite);
  return { db: drizzle(sqlite, { schema }) };
});

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, workspaces } from "@/lib/db/schema";
import { toFtsMatchQuery, searchNodes } from "@/lib/search";

const NOW = Date.now();

function makeNode(
  id: string,
  workspaceId: string,
  title: string,
  content: string,
  parentId: string | null = null,
  type: "group" | "node" = "node"
) {
  return {
    id,
    workspaceId,
    parentId,
    title,
    content,
    position: 0,
    type,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

beforeEach(async () => {
  await db.delete(nodes);
  await db.delete(workspaces);
  await db.insert(workspaces).values([
    { id: "ws-1", name: "Workspace 1", type: "study", createdAt: NOW },
    { id: "ws-2", name: "Workspace 2", type: "study", createdAt: NOW },
  ]);
  await db.insert(nodes).values([
    makeNode("n-loops", "ws-1", "Loops", "While loops repeat until a condition fails."),
    makeNode("n-funcs", "ws-1", "Functions", "Define reusable behavior with def."),
    makeNode("n-other", "ws-2", "Loops elsewhere", "Loops in another workspace."),
  ]);
});

describe("toFtsMatchQuery", () => {
  it("quotes every token and adds a prefix star to the last", () => {
    expect(toFtsMatchQuery("while loop")).toBe('"while" "loop"*');
  });

  it("strips embedded double quotes", () => {
    expect(toFtsMatchQuery('say "hello"')).toBe('"say" "hello"*');
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(toFtsMatchQuery("")).toBeNull();
    expect(toFtsMatchQuery("   ")).toBeNull();
    expect(toFtsMatchQuery('"""')).toBeNull();
  });
});

describe("searchNodes", () => {
  it("finds nodes by title and by content, scoped to the workspace", async () => {
    const byTitle = await searchNodes("ws-1", "functions");
    expect(byTitle.map((r) => r.id)).toEqual(["n-funcs"]);

    const byContent = await searchNodes("ws-1", "condition");
    expect(byContent.map((r) => r.id)).toEqual(["n-loops"]);

    const scoped = await searchNodes("ws-1", "loops");
    expect(scoped.map((r) => r.id)).toEqual(["n-loops"]);
  });

  it("supports prefix matching on the last term", async () => {
    const results = await searchNodes("ws-1", "condi");
    expect(results.map((r) => r.id)).toEqual(["n-loops"]);
  });

  it("reflects updates via triggers", async () => {
    await db
      .update(nodes)
      .set({ content: "Recursion replaces iteration." })
      .where(eq(nodes.id, "n-loops"));

    expect(await searchNodes("ws-1", "condition")).toEqual([]);
    const after = await searchNodes("ws-1", "recursion");
    expect(after.map((r) => r.id)).toEqual(["n-loops"]);
  });

  it("drops deleted nodes from results", async () => {
    await db.delete(nodes).where(eq(nodes.id, "n-loops"));
    expect(await searchNodes("ws-1", "loops")).toEqual([]);
  });

  it("never returns children removed by a cascading group delete", async () => {
    await db
      .insert(nodes)
      .values([
        makeNode("g-1", "ws-1", "Module", "", null, "group"),
        makeNode("n-child", "ws-1", "Generators", "Lazy iteration with yield.", "g-1"),
      ]);
    expect((await searchNodes("ws-1", "generators")).map((r) => r.id)).toEqual([
      "n-child",
    ]);

    await db.delete(nodes).where(eq(nodes.id, "g-1"));
    expect(await searchNodes("ws-1", "generators")).toEqual([]);
  });

  it("wraps matches in control-char markers in the snippet", async () => {
    const [result] = await searchNodes("ws-1", "condition");
    expect(result.snippet).toContain("\u0001condition\u0002");
  });

  it("survives hostile input without throwing", async () => {
    await expect(searchNodes("ws-1", '"; DROP TABLE nodes --')).resolves.toBeDefined();
    await expect(searchNodes("ws-1", "*")).resolves.toBeDefined();
    await expect(searchNodes("ws-1", "NOT AND OR")).resolves.toBeDefined();
  });
});
