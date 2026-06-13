import type { Database } from "better-sqlite3";

// The FTS index is created at runtime because drizzle-kit push cannot manage
// virtual tables. All DDL here is idempotent; tests call this on their own
// in-memory handle so production and test schemas can never drift.
export function ensureSearchIndex(sqlite: Database) {
  // On a fresh install the app can boot before `npm run db:push` has created
  // the nodes table; skip until it exists (the next boot picks it up).
  const nodesTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'nodes'")
    .get();
  if (!nodesTable) return;

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts
      USING fts5(id UNINDEXED, workspace_id UNINDEXED, title, content);

    CREATE TRIGGER IF NOT EXISTS nodes_fts_after_insert
    AFTER INSERT ON nodes BEGIN
      INSERT INTO nodes_fts(id, workspace_id, title, content)
      VALUES (new.id, new.workspace_id, new.title, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS nodes_fts_after_delete
    AFTER DELETE ON nodes BEGIN
      DELETE FROM nodes_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS nodes_fts_after_update
    AFTER UPDATE OF title, content ON nodes BEGIN
      UPDATE nodes_fts SET title = new.title, content = new.content
      WHERE id = new.id;
    END;

    -- Reconcile rows written before the index existed, and orphans left by
    -- cascade deletes that bypass the delete trigger.
    DELETE FROM nodes_fts WHERE id NOT IN (SELECT id FROM nodes);
    INSERT INTO nodes_fts(id, workspace_id, title, content)
      SELECT id, workspace_id, title, content FROM nodes
      WHERE id NOT IN (SELECT id FROM nodes_fts);
  `);
}
