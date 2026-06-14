# MyNodebook Roadmap

Where the product goes next. MyNodebook is MVP-complete — workspace CRUD, PDF/URL/text ingestion, AI outline generation, markdown nodes with drag-and-drop, per-node AI actions, flashcards + study, ZIP/markdown export, full-text search, and BYO key for Anthropic/OpenAI/Ollama all ship today.

The gaps that hold it back are **depth and trust**, not surface area. This roadmap builds the shared foundation first (so both course creators and students benefit), then layers student depth, then creator publishing. It stays within the project's constraints: **local-first, single-user, self-hosted** — no marketplace, cloud, or multi-user.

Legend: ✅ done · 🔜 next · ⬜ planned

---

## Phase 0 — Foundation: trust & grounding

Make every node traceable to its sources, and make the first run never dead-end.

### 0a. Source attribution ✅
Nodes now record which sources informed them, surfaced as citations.

- `node_sources` join table linking nodes ↔ sources, cascade on both sides.
- Outline generation attributes each node (model cites source ids; validated on apply).
- Grounded node actions (expand / rewrite / flashcards / ask) attach their context sources **on accept**; `summarize` attaches none.
- Source chips under the node title (open the source); the Sources panel highlights what informed the selected node.

### 0b. First-run & reliability ✅
- **Provider nudge** — when no provider/key is configured, the AI action bar and Generate Outline show a "Connect a provider in Settings" prompt and disable the actions, instead of failing after a request.
- **First-run guidance** — a fresh workspace (no nodes) shows a composed 3-step getting-started in the editor pane ("Add a source → Generate an outline → Write & study").
- **Source retry** — errored URL sources get a "Retry" button that re-runs extraction. PDF/text aren't re-runnable (no stored bytes) and keep the "delete and add again" path.

---

## Phase 1 — Student depth: a real learning loop 🟡

Turn one-shot flashcards into retention. Builds on Phase 0's per-node grounding.

- **Persistent spaced repetition** ✅ — per-card review state (ease/interval/due) with a lightweight SM-2 scheduler; study grades cards Again/Good/Easy and persists. Review state is keyed by a hash of the question, so it survives deck reorder/regeneration.
- **"Study what's due" across the workspace** ✅ — a "Study due (N)" button in the header opens a due-first session pulling cards from all nodes.
- **Progress signals** ✅ — per-node due-count badges in the outline and the workspace total in the header.
- *(Stretch)* **Quiz mode** ⬜ — AI-generated multiple-choice from sources, reusing the grounded context. Deferred.

---

## Phase 2 — Creator value: authoring & publishing ✅

Make output worth sharing or selling, and close the portability gap.

- **Richer export** ✅ — the markdown zip now includes each node's flashcards and a root `README.md` table of contents.
- **Self-contained HTML export** ✅ — `Export → Web page (.html)` renders the whole workspace into one offline, styled file (TOC, content, citations, flashcards). Doubles as the read-only shareable view; print to PDF from the browser. (True server-side PDF stays out of scope — no headless-renderer dep.)
- **Round-trip import** ✅ — "Import" on the home page recreates a workspace from an exported markdown zip (outline, content, flashcards), keyed off the same file conventions the export produces.

---

## Phase 3 — Bigger bets ⬜

Directional; revisit after Phases 0–2 land.

- **More source types** — YouTube transcript, `.docx` / `.epub`, image OCR, behind the same status lifecycle.
- **E2E tests** — Playwright coverage of the source → outline → study → export flow (today only unit tests exist).
- **Local-first sync/backup or desktop app (Tauri)** — explicitly deferred; only if user demand appears. Keep the SQLite single-user default intact.

---

## Sequencing rationale

Phase 0 comes first because attribution is the trust substrate both audiences need (and the only spec'd "should-have" that was missing), while the first-run fixes prevent the most common dead-ends. Phase 1 makes the *study* workspace type genuinely retentive. Phase 2 makes the *course* type shippable and fixes portability. Phase 3 is optional expansion, gated on demand.

## Out of scope

Marketplace/selling infrastructure, cloud SaaS, multi-user/collaboration, and mobile remain deferred per `AGENTS.md`.
