"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { OutlineNode, Source } from "@/lib/db/schema";
import type { NodeAction } from "@/lib/ai/prompts";
import {
  attachNodeSources,
  renameNode,
  updateNodeContent,
  updateNodeFlashcards,
} from "@/lib/actions/nodes";
import { parseFlashcards } from "@/lib/flashcards";
import { AiActionBar, AskBar, ReviewPanel } from "./AiToolbar";
import { FlashcardStudy } from "./FlashcardStudy";
import { SourceTypeIcon, SourceViewerDialog } from "./SourceViewerDialog";

const AUTOSAVE_MS = 800;

export function NodeEditor({
  node,
  nodes,
  workspaceId,
  sources = [],
  informingSourceIds = [],
  aiConfigured = false,
}: {
  node: OutlineNode | null;
  nodes: OutlineNode[];
  workspaceId: string;
  sources?: Source[];
  informingSourceIds?: string[];
  aiConfigured?: boolean;
}) {
  if (!node) {
    // Fresh workspace (no nodes yet) gets a getting-started path; otherwise
    // just prompt to pick a node.
    if (nodes.length === 0) {
      return <GettingStarted hasSources={sources.length > 0} />;
    }
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
        Select a node in the outline to start editing.
      </div>
    );
  }
  if (node.type === "group") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
        “{node.title}” is a group. Select a node inside it to edit content.
      </div>
    );
  }
  return (
    <Editor
      node={node}
      workspaceId={workspaceId}
      sources={sources}
      informingSourceIds={informingSourceIds}
      aiConfigured={aiConfigured}
    />
  );
}

function GettingStarted({ hasSources }: { hasSources: boolean }) {
  const steps = [
    {
      n: 1,
      title: "Add a source",
      body: "Drop in a PDF, paste a URL, or paste text in the Sources panel on the right.",
      done: hasSources,
    },
    {
      n: 2,
      title: "Generate an outline",
      body: "Let the AI propose a structure from your sources — review it, then accept.",
      done: false,
    },
    {
      n: 3,
      title: "Write & study",
      body: "Expand nodes with AI, then turn them into flashcards and study.",
      done: false,
    },
  ];
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h2 className="font-display text-2xl text-ink">Get started</h2>
        <p className="mt-1.5 text-sm text-muted">
          Build structured knowledge from your sources in three steps.
        </p>
        <ol className="mt-6 space-y-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex gap-3 rounded-xl border border-hairline bg-canvas px-4 py-3.5"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? "bg-accent/15 text-accent"
                    : "bg-surface-card text-muted"
                }`}
              >
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Editor({
  node,
  workspaceId,
  sources,
  informingSourceIds,
  aiConfigured,
}: {
  node: OutlineNode;
  workspaceId: string;
  sources: Source[];
  informingSourceIds: string[];
  aiConfigured: boolean;
}) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">(
    "saved"
  );
  const [streaming, setStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [studying, setStudying] = useState(false);
  const [flashcards, setFlashcards] = useState(node.flashcards ?? "");
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const [review, setReview] = useState<{
    action: NodeAction;
    text: string;
    sourceIds: string[];
  } | null>(null);
  const cards = useMemo(() => parseFlashcards(flashcards), [flashcards]);
  const informingSources = sources.filter((s) =>
    informingSourceIds.includes(s.id)
  );
  const busy = streaming || review !== null;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title: node.title, content: node.content });
  const abortRef = useRef<AbortController | null>(null);
  const pending = useRef<{ title: string; content: string } | null>(null);

  const persist = async (nextTitle: string, nextContent: string) => {
    pending.current = null;
    setSaveState("saving");
    if (nextTitle.trim() && nextTitle !== latest.current.title) {
      await renameNode(node.id, nextTitle);
      latest.current.title = nextTitle;
    }
    if (nextContent !== latest.current.content) {
      await updateNodeContent(node.id, nextContent);
      latest.current.content = nextContent;
    }
    setSaveState("saved");
  };

  const scheduleSave = (nextTitle: string, nextContent: string) => {
    setSaveState("dirty");
    pending.current = { title: nextTitle, content: nextContent };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(nextTitle, nextContent), AUTOSAVE_MS);
  };

  useEffect(() => {
    const flush = () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) {
        const { title, content } = pending.current;
        void persist(title, content);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flush();
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (action: NodeAction, question?: string) => {
    setAiError(null);
    if (timer.current) clearTimeout(timer.current);

    let acc = "";
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    // Stream into the review buffer — nothing is written to the node until
    // the user accepts. Content/flashcards stay untouched here.
    setReview({ action, text: "", sourceIds: [] });
    try {
      // Save first so the server-side context sees the latest content.
      await persist(title, content);

      const res = await fetch("/api/ai/node-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, nodeId: node.id, action, question }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setAiError(data?.error ?? "AI request failed.");
        setReview(null);
        return;
      }

      // Sources that grounded this response — attached to the node on accept.
      const sourceIds = (res.headers.get("X-Source-Ids") ?? "")
        .split(",")
        .filter(Boolean);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setReview({ action, text: acc, sourceIds });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setAiError("The AI response was interrupted. Partial output was kept.");
      }
      // Keep whatever streamed in for review; drop an empty buffer.
      if (!acc) setReview(null);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const acceptReview = () => {
    if (!review) return;
    const { action, text, sourceIds } = review;
    if (action === "flashcards") {
      setFlashcards(text);
      void updateNodeFlashcards(node.id, text);
    } else if (action === "summarize" || action === "rewrite") {
      setContent(text);
      void persist(title, text);
    } else {
      const next = content.trim()
        ? content.replace(/\s+$/, "") + "\n\n" + text
        : text;
      setContent(next);
      void persist(title, next);
    }
    // Record the sources that grounded the accepted content (no-op for
    // summarize, which never receives sources).
    if (sourceIds.length > 0) {
      void attachNodeSources(node.id, sourceIds);
    }
    setReview(null);
  };

  const reviewAddLabel = (action: NodeAction) =>
    action === "flashcards"
      ? "Save to deck"
      : action === "summarize" || action === "rewrite"
        ? "Replace node"
        : "Add to node";

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-8">
      <div className="flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(e.target.value, content);
          }}
          placeholder="Untitled node"
          className="min-w-0 flex-1 bg-transparent font-display text-display text-ink outline-none placeholder:text-muted-soft"
        />
        <span
          className={`badge shrink-0 bg-surface-card ${
            streaming
              ? "text-action-flashcards"
              : saveState === "saved"
                ? "text-muted"
                : saveState === "saving"
                  ? "text-action-expand"
                  : "text-action-rewrite"
          }`}
        >
          {streaming
            ? "Generating…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "saving"
                ? "Saving…"
                : "Unsaved"}
        </span>
        <div className="pill-group shrink-0">
          <button
            onClick={() => setPreview(false)}
            className={`pill-tab px-2.5 py-1 text-xs ${!preview ? "pill-tab-active" : ""}`}
          >
            Edit
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`pill-tab px-2.5 py-1 text-xs ${preview ? "pill-tab-active" : ""}`}
          >
            Preview
          </button>
        </div>
      </div>

      {informingSources.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-soft">
            Sources
          </span>
          {informingSources.map((source) => (
            <button
              key={source.id}
              onClick={() => setViewingSource(source)}
              title={`Informed by "${source.title}"`}
              className="inline-flex max-w-44 items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent transition-colors hover:bg-accent/20"
            >
              <SourceTypeIcon type={source.type} className="h-3 w-3 shrink-0" />
              <span className="truncate">{source.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <AiActionBar
          disabled={busy}
          aiConfigured={aiConfigured}
          onRun={runAction}
          cardCount={cards.length}
          onStudy={() => setStudying(true)}
        />
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {review ? (
          <ReviewPanel
            action={review.action}
            addLabel={reviewAddLabel(review.action)}
            text={review.text}
            streaming={streaming}
            onAdd={acceptReview}
            onDiscard={() => setReview(null)}
            onStop={() => abortRef.current?.abort()}
          />
        ) : preview ? (
          <div className="prose prose-neutral h-full max-w-none overflow-y-auto dark:prose-invert">
            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-muted">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave(title, e.target.value);
            }}
            placeholder="Write markdown here, or use the AI actions below…"
            className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none"
          />
        )}
      </div>

      <div className="mt-3 shrink-0 pb-1">
        <AskBar
          disabled={busy || !aiConfigured}
          error={aiError}
          onAsk={(q) => runAction("ask", q)}
        />
      </div>

      {studying && (
        <FlashcardStudy cards={cards} onClose={() => setStudying(false)} />
      )}

      <SourceViewerDialog
        source={viewingSource}
        onClose={() => setViewingSource(null)}
      />
    </div>
  );
}
