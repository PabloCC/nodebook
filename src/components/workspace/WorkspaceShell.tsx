"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OutlineNode, Source, Workspace } from "@/lib/db/schema";
import { buildTree } from "@/lib/tree";
import { OutlineTree } from "./OutlineTree";
import { NodeEditor } from "./NodeEditor";
import { SearchBox } from "./SearchBox";
import { SourcesPanel } from "./SourcesPanel";
import { BackIcon, ExportIcon } from "@/components/ui/icons";

export function WorkspaceShell({
  workspace,
  nodes,
  sources,
}: {
  workspace: Workspace;
  nodes: OutlineNode[];
  sources: Source[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

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
          <a
            href={`/api/export/${workspace.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <ExportIcon className="h-4 w-4" weight="bold" />
            Export
          </a>
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
          />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-canvas">
          <NodeEditor
            key={selectedNode?.id ?? "none"}
            node={selectedNode}
            nodes={nodes}
            workspaceId={workspace.id}
          />
        </main>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-hairline bg-surface-soft">
          <SourcesPanel workspaceId={workspace.id} sources={sources} />
        </aside>
      </div>
    </div>
  );
}
