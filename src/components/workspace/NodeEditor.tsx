"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { OutlineNode } from "@/lib/db/schema";
import type { NodeAction } from "@/lib/ai/prompts";
import { renameNode, updateNodeContent } from "@/lib/actions/nodes";
import { AiToolbar } from "./AiToolbar";

const AUTOSAVE_MS = 800;

export function NodeEditor({
  node,
  workspaceId,
}: {
  node: OutlineNode | null;
  nodes: OutlineNode[];
  workspaceId: string;
}) {
  if (!node) {
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
  return <Editor node={node} workspaceId={workspaceId} />;
}

function Editor({
  node,
  workspaceId,
}: {
  node: OutlineNode;
  workspaceId: string;
}) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">(
    "saved"
  );
  const [streaming, setStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
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

    const replace = action === "summarize" || action === "rewrite";
    let acc = replace
      ? ""
      : content.trim()
        ? content.replace(/\s+$/, "") + "\n\n"
        : "";

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
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
        return;
      }

      setContent(acc);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setContent(acc);
      }
      await persist(title, acc);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setAiError("The AI response was interrupted. Partial output was kept.");
      }
      // Keep whatever streamed in, even on stop/interruption.
      if (acc) await persist(title, acc);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

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
          className="min-w-0 flex-1 bg-transparent text-display font-semibold text-ink outline-none placeholder:text-muted-soft"
        />
        <span className="shrink-0 text-xs text-muted">
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

      <div className="mt-4 min-h-0 flex-1">
        {preview ? (
          <div className="prose prose-neutral h-full max-w-none overflow-y-auto">
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
            readOnly={streaming}
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
        <AiToolbar
          streaming={streaming}
          error={aiError}
          onRun={runAction}
          onStop={() => abortRef.current?.abort()}
        />
      </div>
    </div>
  );
}
