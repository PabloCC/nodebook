"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OutlineNode, Source, Workspace } from "@/lib/db/schema";
import type { ReviewState, Grade } from "@/lib/srs";
import { buildTree } from "@/lib/tree";
import { dueCount, workspaceDueDeck } from "@/lib/study-deck";
import { recordReview, refreshWorkspaceReviews } from "@/lib/actions/flashcards";
import { OutlineTree } from "./OutlineTree";
import { NodeEditor } from "./NodeEditor";
import { SearchBox } from "./SearchBox";
import { SourcesPanel } from "./SourcesPanel";
import { FlashcardStudy } from "./FlashcardStudy";
import { BackIcon, ExportIcon, StudyIcon } from "@/components/ui/icons";

export function WorkspaceShell({
  workspace,
  nodes,
  sources,
  nodeSourceMap,
  reviewMap,
  aiConfigured,
}: {
  workspace: Workspace;
  nodes: OutlineNode[];
  sources: Source[];
  nodeSourceMap: Record<string, string[]>;
  reviewMap: Record<string, Record<string, ReviewState>>;
  aiConfigured: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [studyingWorkspace, setStudyingWorkspace] = useState(false);
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const informingSourceIds = selectedId
    ? (nodeSourceMap[selectedId] ?? [])
    : [];

  // Due counts per node (for outline badges) and the workspace total.
  const dueByNode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const node of nodes) {
      if (node.type !== "node") continue;
      const n = dueCount(node, reviewMap[node.id]);
      if (n > 0) map[node.id] = n;
    }
    return map;
  }, [nodes, reviewMap]);
  const totalDue = useMemo(
    () => Object.values(dueByNode).reduce((a, b) => a + b, 0),
    [dueByNode]
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <BackIcon className="h-4 w-4" weight="bold" />
          MyNodebook
        </Link>
        <span className="text-muted-soft">/</span>
        <h1 className="truncate font-display text-[15px] text-ink">
          {workspace.name}
        </h1>
        <span className="badge bg-surface-card text-muted">
          {workspace.type === "course" ? "Course" : "Study"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          {totalDue > 0 && (
            <button
              onClick={() => setStudyingWorkspace(true)}
              className="btn-action btn-action-flashcards"
            >
              <StudyIcon className="h-3.5 w-3.5" weight="fill" aria-hidden />
              Study due ({totalDue})
            </button>
          )}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              <ExportIcon className="h-4 w-4" weight="bold" />
              Export
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-hairline bg-canvas py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <a
                href={`/api/export/${workspace.id}`}
                className="block px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-soft"
              >
                Markdown (.zip)
              </a>
              <a
                href={`/api/export/${workspace.id}?format=html`}
                className="block px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-soft"
              >
                Web page (.html)
              </a>
            </div>
          </details>
          <Link
            href="/settings"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Settings
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-x-hidden overflow-y-auto border-r border-hairline bg-surface-soft">
          <SearchBox workspaceId={workspace.id} onSelect={setSelectedId} />
          <OutlineTree
            workspaceId={workspace.id}
            tree={tree}
            sources={sources}
            selectedId={selectedId}
            onSelect={setSelectedId}
            aiConfigured={aiConfigured}
            dueByNode={dueByNode}
          />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-canvas">
          <NodeEditor
            key={selectedNode?.id ?? "none"}
            node={selectedNode}
            nodes={nodes}
            workspaceId={workspace.id}
            sources={sources}
            informingSourceIds={informingSourceIds}
            aiConfigured={aiConfigured}
            reviews={selectedId ? (reviewMap[selectedId] ?? {}) : {}}
          />
        </main>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-hairline bg-surface-soft">
          <SourcesPanel
            workspaceId={workspace.id}
            sources={sources}
            informingSourceIds={informingSourceIds}
          />
        </aside>
      </div>

      {studyingWorkspace && (
        <FlashcardStudy
          cards={workspaceDueDeck(nodes, reviewMap)}
          onGrade={(nodeId, key, grade: Grade) =>
            void recordReview(nodeId, key, grade)
          }
          onClose={() => {
            setStudyingWorkspace(false);
            void refreshWorkspaceReviews(workspace.id);
          }}
        />
      )}
    </div>
  );
}
