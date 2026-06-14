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

### 0b. First-run & reliability 🔜
- **Provider nudge** — when no API key/provider is configured, show an inline "Connect a provider in Settings" prompt on the AI action bar instead of failing after a request.
- **Empty-state guidance** — composed empty states for the outline and editor panels: a 3-step nudge ("Add a source → Generate outline → Study").
- **Source retry** — a "Retry" affordance on `status: "error"` sources, re-running extraction immediately (manual counterpart to the existing stale-extraction recovery on load).

---

## Phase 1 — Student depth: a real learning loop ⬜

Turn one-shot flashcards into retention. Builds on Phase 0's per-node grounding.

- **Persistent spaced repetition** — store per-card review state (ease, interval, due, last reviewed); a lightweight SM-2. Study records grades instead of discarding session state.
- **"Study what's due" across the workspace** — pull due cards from all nodes, not just the open one.
- **Progress signals** — per-node / workspace mastery indicators (due / learning / known) in the outline.
- *(Stretch)* **Quiz mode** — AI-generated multiple-choice from sources, reusing the grounded context.

---

## Phase 2 — Creator value: authoring & publishing ⬜

Make output worth sharing or selling, and close the portability gap.

- **Richer export** — include flashcards, add a table of contents, and a single self-contained HTML (and/or PDF) export alongside the markdown folder.
- **Round-trip import** — re-import an exported workspace (markdown folder / zip) to restore outline + content; makes workspaces portable and backup-able.
- **Read-only shareable view** — a static, self-contained published view of a workspace (with citations from Phase 0), suitable for handing to students.

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
