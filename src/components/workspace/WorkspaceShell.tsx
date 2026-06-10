"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OutlineNode, Source, Workspace } from "@/lib/db/schema";
import { buildTree } from "@/lib/tree";
import { OutlineTree } from "./OutlineTree";
import { NodeEditor } from "./NodeEditor";
import { SourcesPanel } from "./SourcesPanel";

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
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 px-4">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← MyNodebook
        </Link>
        <span className="text-neutral-300">/</span>
        <h1 className="truncate text-sm font-semibold">{workspace.name}</h1>
        <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
          {workspace.type === "course" ? "Course" : "Study"}
        </span>
        <div className="ml-auto">
          <Link
            href="/settings"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Settings
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-neutral-200">
          <OutlineTree
            workspaceId={workspace.id}
            tree={tree}
            sources={sources}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <NodeEditor
            key={selectedNode?.id ?? "none"}
            node={selectedNode}
            nodes={nodes}
            workspaceId={workspace.id}
          />
        </main>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-neutral-200">
          <SourcesPanel workspaceId={workspace.id} sources={sources} />
        </aside>
      </div>
    </div>
  );
}
