import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/db", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const schema = await import("@/lib/db/schema");
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
      position integer NOT NULL,
      type text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE INDEX nodes_workspace_idx ON nodes (workspace_id);
    CREATE INDEX nodes_parent_idx ON nodes (parent_id);
  `);
  return { db: drizzle(sqlite, { schema }) };
});

import { db } from "@/lib/db";
import { nodes, workspaces } from "@/lib/db/schema";
import { moveNode } from "@/lib/actions/nodes";
import { eq, asc } from "drizzle-orm";

async function insertFixture() {
  const now = Date.now();
  await db.insert(workspaces).values({
    id: "ws-1",
    name: "Test",
    type: "study",
    createdAt: 1,
  });
  await db.insert(nodes).values([
    {
      id: "root-a",
      workspaceId: "ws-1",
      parentId: null,
      title: "Root A",
      content: "",
      position: 0,
      type: "group",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "child-a1",
      workspaceId: "ws-1",
      parentId: "root-a",
      title: "Child A1",
      content: "",
      position: 0,
      type: "node",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "child-a2",
      workspaceId: "ws-1",
      parentId: "root-a",
      title: "Child A2",
      content: "",
      position: 1,
      type: "node",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "root-b",
      workspaceId: "ws-1",
      parentId: null,
      title: "Root B",
      content: "",
      position: 1,
      type: "group",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "child-b1",
      workspaceId: "ws-1",
      parentId: "root-b",
      title: "Child B1",
      content: "",
      position: 0,
      type: "node",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "root-c",
      workspaceId: "ws-1",
      parentId: null,
      title: "Root C",
      content: "",
      position: 2,
      type: "node",
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

async function getRootNodes() {
  return db
    .select()
    .from(nodes)
    .where(eq(nodes.workspaceId, "ws-1"))
    .orderBy(asc(nodes.position));
}

async function getNode(id: string) {
  const [n] = await db.select().from(nodes).where(eq(nodes.id, id));
  return n;
}

async function getChildren(parentId: string) {
  return db
    .select()
    .from(nodes)
    .where(eq(nodes.parentId, parentId))
    .orderBy(asc(nodes.position));
}

describe("moveNode characterization tests", () => {
  beforeEach(async () => {
    // Delete in FK-safe order
    await db.delete(nodes);
    await db.delete(workspaces);
    await insertFixture();
  });

  it("1. reorders within siblings (root-c to front)", async () => {
    await moveNode("root-c", null, 0);
    const roots = (await getRootNodes()).filter((n) => n.parentId === null);
    const ids = roots.map((n) => n.id);
    expect(ids).toEqual(["root-c", "root-a", "root-b"]);
    const positions = roots.map((n) => n.position);
    expect(positions).toEqual([0, 1, 2]);
  });

  it("2. moves into a group at an index and reindexes old siblings", async () => {
    await moveNode("child-a1", "root-b", 1);
    const movedNode = await getNode("child-a1");
    expect(movedNode.parentId).toBe("root-b");

    const rootBChildren = await getChildren("root-b");
    expect(rootBChildren.map((n) => n.id)).toEqual(["child-b1", "child-a1"]);
    expect(rootBChildren.map((n) => n.position)).toEqual([0, 1]);

    const rootAChildren = await getChildren("root-a");
    expect(rootAChildren.map((n) => n.id)).toEqual(["child-a2"]);
    expect(rootAChildren[0].position).toBe(0);
  });

  it("3a. cycle guard: moving node into itself is a no-op", async () => {
    await moveNode("root-a", "root-a", 0);
    const nodeA = await getNode("root-a");
    expect(nodeA.parentId).toBeNull();
    expect(nodeA.position).toBe(0);
  });

  it("3b. cycle guard: moving node into its descendant is a no-op", async () => {
    const now = Date.now();
    // Insert a sub-group under root-a
    await db.insert(nodes).values({
      id: "sub-a",
      workspaceId: "ws-1",
      parentId: "root-a",
      title: "Sub A",
      content: "",
      position: 2,
      type: "group",
      createdAt: now,
      updatedAt: now,
    });
    await moveNode("root-a", "sub-a", 0);
    const nodeA = await getNode("root-a");
    expect(nodeA.parentId).toBeNull();
    expect(nodeA.position).toBe(0);
  });

  it("4. move to a non-group parent is a no-op", async () => {
    // root-c is type 'node', not 'group'
    await moveNode("child-b1", "root-c", 0);
    const childB1 = await getNode("child-b1");
    expect(childB1.parentId).toBe("root-b");
    expect(childB1.position).toBe(0);
  });

  it("5. unknown node id is a no-op and does not throw", async () => {
    await expect(moveNode("nope", null, 0)).resolves.toBeUndefined();
    const allNodes = await getRootNodes();
    expect(allNodes.length).toBeGreaterThan(0);
  });

  it("6. clamping: high index appends at the end of roots", async () => {
    await moveNode("child-b1", null, 999);
    const roots = (await getRootNodes()).filter((n) => n.parentId === null);
    const last = roots[roots.length - 1];
    expect(last.id).toBe("child-b1");
    expect(last.position).toBe(roots.length - 1);
  });
});
