<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MyNodebook

Open source tool to build, organize, and study structured knowledge from any sources, with AI as a collaborator, not a chatbot. Solves two failures of NotebookLM-style tools: no persistence (output lost in chat threads) and no structure (no modules/lessons/topics).

**Target users:** Creators building courses to publish/sell/share, and students organizing their own sources to study. Both share the same workflow: sources → structure → iterate.

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Workspace** | Self-contained project (one course or one subject). Owns its sources, outline, and nodes. |
| **Source** | Input material: PDF, URL, or plain text. Lives in the workspace. |
| **Outline** | The tree structure of a workspace: groups and nodes. |
| **Group** | Container node — a module or topic section. |
| **Node** | Leaf with content: summary, lesson, notes, flashcards. |
| **AI Context** | Sources + outline context passed on each generation request. Scoped per workspace. No chat history — each AI action is a standalone request with full context. |

## Key Product Rules

- AI actions (Expand, Summarize, Rewrite, Generate Flashcards, Ask) append or replace content **in the node**, never in a floating chat.
- Generated outlines are shown as a **preview diff** the user accepts/edits/rejects before applying.
- Outline supports drag-and-drop reorder, inline rename, manual node creation, delete with confirmation.
- Bring your own API key (OpenAI / Anthropic) or Ollama for fully local usage.
- Local-first, single user, self-hosted. No marketplace, no multi-user, no cloud sync, no mobile (v1).

## Tech Stack (actual, not the spec draft)

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) — Server Actions for mutations, API Routes for streaming AI endpoints |
| DB | SQLite via `better-sqlite3` + **Drizzle ORM** (`drizzle-kit push` via `npm run db:push`) |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible` for Ollama) |
| UI | Tailwind CSS v4, `@dnd-kit` for outline drag-and-drop, `react-markdown` + `remark-gfm` for rendering |
| Extraction | `unpdf` (PDF), `@mozilla/readability` + `jsdom` (URL) |
| Validation | Zod |

## Code Layout

```
src/
├── app/
│   ├── page.tsx                      # workspace list / home
│   ├── workspace/[id]/page.tsx       # main 3-panel view (outline | editor | sources)
│   ├── settings/page.tsx             # provider + API key settings
│   └── api/ai/
│       ├── generate-outline/route.ts # streaming AI endpoints
│       └── node-action/route.ts
├── components/
│   ├── workspace/    # WorkspaceShell, OutlineTree, NodeEditor, AiToolbar, SourcesPanel, OutlinePreviewDialog
│   ├── settings/
│   └── ui/
└── lib/
    ├── db/           # Drizzle schema + client
    ├── actions/      # Server Actions: workspaces, nodes, sources, settings
    ├── ai/           # provider setup, prompts, context building, outline schema, errors
    ├── extract/      # pdf.ts, url.ts
    ├── tree.ts       # outline tree helpers
    └── settings.ts
```

## Data Model

- `Workspace`: id, name, type (`course` | `study`), created_at
- `Source`: id, workspace_id, type (`pdf` | `url` | `text`), content (raw text), created_at
- `Node`: id, workspace_id, parent_id (nullable — set for children of groups), title, content (markdown), position (int ordering), type (`group` | `node`), created_at, updated_at

Canonical schema lives in `src/lib/db/schema.ts`.

## MVP Scope

**Must have:** workspace CRUD, source ingestion (PDF/URL/text), AI-generated outline, markdown node editor, per-node AI actions, drag-and-drop reorder, local persistence, BYO API key, Ollama support.

**Should have:** flashcards per node, export workspace as markdown folder, source highlighting (which source informed a node), search across nodes.

**Deferred:** desktop app (Tauri/Electron), marketplace/selling, cloud SaaS, multi-user workspaces.

**Next steps:** the post-MVP direction (trust & grounding, study loop, publishing) is tracked in [ROADMAP.md](ROADMAP.md).

## Project Conventions

- License MIT; product name **MyNodebook**, repo `nodebook`.
- Setup must stay trivial: `npm run dev` (or Docker Compose).
- Keep SQLite as the local default; don't introduce infra that breaks single-user self-hosting.
