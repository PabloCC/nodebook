// NOTE: The raw DDL below mirrors src/lib/db/schema.ts — update both together
// if the workspaces or sources schema changes.

import { describe, it, expect, vi, beforeEach } from "vitest";

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
    CREATE TABLE sources (
      id text PRIMARY KEY,
      workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type text NOT NULL,
      title text NOT NULL,
      original_ref text,
      content text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'processing',
      error_message text,
      created_at integer NOT NULL
    );
    CREATE INDEX sources_workspace_idx ON sources (workspace_id);
  `);
  return { db: drizzle(sqlite, { schema }) };
});

import { db } from "@/lib/db";
import { sources, workspaces } from "@/lib/db/schema";
import { reconcileStaleSources } from "@/lib/sources";
import { eq } from "drizzle-orm";

const NOW = Date.now();
const OLD = NOW - 10 * 60_000; // 10 minutes ago — stale
const FRESH = NOW - 60_000;    // 1 minute ago — still fresh

async function insertFixture() {
  await db.insert(workspaces).values([
    { id: "ws-1", name: "Workspace 1", type: "study", createdAt: NOW },
    { id: "ws-2", name: "Workspace 2", type: "study", createdAt: NOW },
  ]);

  await db.insert(sources).values([
    // ws-1 sources
    {
      id: "src-stale",
      workspaceId: "ws-1",
      type: "url",
      title: "Stale processing",
      content: "",
      status: "processing",
      createdAt: OLD,
    },
    {
      id: "src-fresh",
      workspaceId: "ws-1",
      type: "url",
      title: "Fresh processing",
      content: "",
      status: "processing",
      createdAt: FRESH,
    },
    {
      id: "src-ready",
      workspaceId: "ws-1",
      type: "text",
      title: "Ready source",
      content: "some content",
      status: "ready",
      createdAt: OLD,
    },
    {
      id: "src-error",
      workspaceId: "ws-1",
      type: "text",
      title: "Error source",
      content: "",
      status: "error",
      errorMessage: "original error",
      createdAt: OLD,
    },
    // ws-2 sources
    {
      id: "src-ws2-stale",
      workspaceId: "ws-2",
      type: "url",
      title: "WS2 stale processing",
      content: "",
      status: "processing",
      createdAt: OLD,
    },
  ]);
}

beforeEach(async () => {
  await db.delete(sources);
  await db.delete(workspaces);
  await insertFixture();
});

describe("reconcileStaleSources", () => {
  it("1. marks an old processing source as error with an actionable message", async () => {
    await reconcileStaleSources("ws-1");

    const [row] = await db
      .select({ status: sources.status, errorMessage: sources.errorMessage })
      .from(sources)
      .where(eq(sources.id, "src-stale"));

    expect(row.status).toBe("error");
    expect(row.errorMessage).toMatch(/interrupted/i);
  });

  it("2. leaves a fresh processing source untouched", async () => {
    await reconcileStaleSources("ws-1");

    const [row] = await db
      .select({ status: sources.status })
      .from(sources)
      .where(eq(sources.id, "src-fresh"));

    expect(row.status).toBe("processing");
  });

  it("3. does not touch ready or error sources, even if old", async () => {
    await reconcileStaleSources("ws-1");

    const [ready] = await db
      .select({ status: sources.status })
      .from(sources)
      .where(eq(sources.id, "src-ready"));

    const [error] = await db
      .select({ status: sources.status, errorMessage: sources.errorMessage })
      .from(sources)
      .where(eq(sources.id, "src-error"));

    expect(ready.status).toBe("ready");
    expect(error.status).toBe("error");
    expect(error.errorMessage).toBe("original error");
  });

  it("4. does not reconcile sources from a different workspace", async () => {
    await reconcileStaleSources("ws-1");

    const [row] = await db
      .select({ status: sources.status })
      .from(sources)
      .where(eq(sources.id, "src-ws2-stale"));

    expect(row.status).toBe("processing");
  });
});
