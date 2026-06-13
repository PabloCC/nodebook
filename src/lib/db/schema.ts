import {
  sqliteTable,
  text,
  integer,
  index,
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

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type OutlineNode = typeof nodes.$inferSelect;
