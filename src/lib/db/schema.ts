import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["course", "study"] })
    .notNull()
    .default("study"),
  createdAt: integer("created_at").notNull(),
});

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["pdf", "url", "text"] }).notNull(),
    title: text("title").notNull(),
    originalRef: text("original_ref"),
    content: text("content").notNull().default(""),
    status: text("status", { enum: ["processing", "ready", "error"] })
      .notNull()
      .default("processing"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("sources_workspace_idx").on(table.workspaceId)]
);

export const nodes = sqliteTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => nodes.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    flashcards: text("flashcards").notNull().default(""),
    position: integer("position").notNull(),
    type: text("type", { enum: ["group", "node"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("nodes_workspace_idx").on(table.workspaceId),
    index("nodes_parent_idx").on(table.parentId),
  ]
);

// Which sources informed a node — populated when an outline is generated and
// when grounded AI actions run. Both sides cascade so links never orphan.
export const nodeSources = sqliteTable(
  "node_sources",
  {
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.nodeId, table.sourceId] }),
    index("node_sources_node_idx").on(table.nodeId),
    index("node_sources_source_idx").on(table.sourceId),
  ]
);

// Spaced-repetition state per flashcard. Keyed by node + a hash of the
// question text (see `cardKey` in src/lib/srs.ts) so it survives deck reorder
// and partial regeneration. Cascades when the node is deleted.
export const flashcardReviews = sqliteTable(
  "flashcard_reviews",
  {
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    cardKey: text("card_key").notNull(),
    ease: real("ease").notNull().default(2.5),
    interval: integer("interval").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    due: integer("due").notNull(),
    lastReviewed: integer("last_reviewed"),
  },
  (table) => [
    primaryKey({ columns: [table.nodeId, table.cardKey] }),
    index("flashcard_reviews_due_idx").on(table.due),
  ]
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type OutlineNode = typeof nodes.$inferSelect;
export type NodeSource = typeof nodeSources.$inferSelect;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
