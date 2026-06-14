# MyNodebook

Open source tool to build, organize, and study structured knowledge from any sources, with AI as a collaborator, not a chatbot.

Unlike chat-based tools, everything the AI generates is anchored to an outline you control: workspaces contain **sources** (PDFs, URLs, text), an **outline** of groups and nodes, and a markdown **editor** with per-node AI actions.

## Features

- **Workspaces** — one per course or subject, stored locally in SQLite.
- **Sources** — upload PDFs, paste URLs (readable text is extracted), or paste raw text.
- **Generate Outline** — AI reads your sources and proposes a structure; you review and accept or reject before anything is saved.
- **Node editor** — markdown with preview, autosave, and AI actions: Expand, Rewrite, Summarize, Flashcards, and Ask. Output streams directly into the node.
- **Drag-and-drop** — reorder nodes and move them between groups in the outline.
- **Bring your own AI** — OpenAI or Anthropic API key, or fully local via [Ollama](https://ollama.com) (auto-detected).

## Roadmap

Where the product is headed — trust & grounding, a real study loop, and publishing — is tracked in [ROADMAP.md](ROADMAP.md).

## Getting started

```bash
npm install
npm run db:push   # create the local SQLite database (data/nodebook.db)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then go to **Settings** to pick a provider and add an API key (or start Ollama). Keys are stored only in your local database.

## Stack

Next.js (App Router) · SQLite + Drizzle · Vercel AI SDK · Tailwind CSS

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run db:push` | Sync the database schema |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Lint |

## License

MIT
