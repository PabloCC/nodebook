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
import {
  BackIcon,
  ExportIcon,
  StudyIcon,
  SettingsIcon,
  OutlineNavIcon,
  EditorNavIcon,
  SourcesNavIcon,
} from "@/components/ui/icons";

type MobilePanel = "outline" | "editor" | "sources";

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
  // Which panel is visible below `lg` (the three don't fit side by side).
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("outline");
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  // Picking a node jumps to the editor on mobile; inert on lg (all visible).
  const selectNode = (id: string | null) => {
    setSelectedId(id);
    if (id) setMobilePanel("editor");
  };
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
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-3 sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <BackIcon className="h-4 w-4" weight="bold" />
          <span className="hidden sm:inline">MyNodebook</span>
        </Link>
        <span className="hidden text-muted-soft sm:inline">/</span>
        <h1 className="min-w-0 flex-1 truncate font-display text-[15px] text-ink">
          {workspace.name}
        </h1>
        <span className="badge hidden bg-surface-card text-muted sm:inline-flex">
          {workspace.type === "course" ? "Course" : "Study"}
        </span>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {totalDue > 0 && (
            <button
              onClick={() => setStudyingWorkspace(true)}
              aria-label={`Study ${totalDue} due`}
              className="btn-action btn-action-flashcards"
            >
              <StudyIcon className="h-3.5 w-3.5" weight="fill" aria-hidden />
              <span className="hidden sm:inline">Study due</span>
              <span className="tabular-nums">{totalDue}</span>
            </button>
          )}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              <ExportIcon className="h-4 w-4" weight="bold" />
              <span className="hidden sm:inline">Export</span>
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
            aria-label="Settings"
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <SettingsIcon className="h-4 w-4" weight="bold" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${mobilePanel === "outline" ? "block" : "hidden"} w-full shrink-0 overflow-x-hidden overflow-y-auto border-r border-hairline bg-surface-soft lg:block lg:w-72`}
        >
          <SearchBox workspaceId={workspace.id} onSelect={selectNode} />
          <OutlineTree
            workspaceId={workspace.id}
            tree={tree}
            sources={sources}
            selectedId={selectedId}
            onSelect={selectNode}
            aiConfigured={aiConfigured}
            dueByNode={dueByNode}
          />
        </aside>

        <main
          className={`${mobilePanel === "editor" ? "block" : "hidden"} min-w-0 flex-1 overflow-y-auto bg-canvas lg:block`}
        >
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

        <aside
          className={`${mobilePanel === "sources" ? "block" : "hidden"} w-full shrink-0 overflow-y-auto border-l border-hairline bg-surface-soft lg:block lg:w-72`}
        >
          <SourcesPanel
            workspaceId={workspace.id}
            sources={sources}
            informingSourceIds={informingSourceIds}
          />
        </aside>
      </div>

      <nav className="flex shrink-0 border-t border-hairline bg-canvas lg:hidden">
        {(
          [
            { key: "outline", label: "Outline", Icon: OutlineNavIcon, badge: totalDue },
            { key: "editor", label: "Editor", Icon: EditorNavIcon, badge: 0 },
            { key: "sources", label: "Sources", Icon: SourcesNavIcon, badge: 0 },
          ] as const
        ).map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => setMobilePanel(key)}
            aria-pressed={mobilePanel === key}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              mobilePanel === key ? "text-accent" : "text-muted"
            }`}
          >
            <Icon
              className="h-5 w-5"
              weight={mobilePanel === key ? "fill" : "regular"}
              aria-hidden
            />
            {label}
            {badge > 0 && (
              <span className="absolute right-1/2 top-1 translate-x-3 rounded-full bg-accent px-1 text-[9px] font-semibold text-primary-fg tabular-nums">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

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
