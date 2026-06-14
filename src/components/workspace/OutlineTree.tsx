"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Source } from "@/lib/db/schema";
import type { TreeNode } from "@/lib/tree";
import type { OutlineProposal } from "@/lib/ai/outline-schema";
import {
  createNode,
  deleteNode,
  moveNode,
  renameNode,
} from "@/lib/actions/nodes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OutlinePreviewDialog } from "./OutlinePreviewDialog";
import {
  AddIcon,
  RenameIcon,
  CloseIcon,
  CollapsedIcon,
  ExpandedIcon,
  ExpandActionIcon,
} from "@/components/ui/icons";

export function OutlineTree({
  workspaceId,
  tree,
  sources,
  selectedId,
  onSelect,
  aiConfigured,
}: {
  workspaceId: string;
  tree: TreeNode[];
  sources: Source[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  aiConfigured: boolean;
}) {
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<OutlineProposal | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);
  const hasReadySources = sources.some((s) => s.status === "ready");

  const byId = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (list: TreeNode[]) => {
      for (const node of list) {
        map.set(node.id, node);
        walk(node.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  const sensors = useSensors(
    // 6px activation distance keeps click / double-click rename working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const siblingsOf = (node: TreeNode): TreeNode[] =>
    node.parentId ? (byId.get(node.parentId)?.children ?? []) : tree;

  const isDescendantOf = (candidate: TreeNode, ancestorId: string): boolean => {
    for (
      let cursor: TreeNode | undefined = candidate;
      cursor;
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    ) {
      if (cursor.id === ancestorId) return true;
    }
    return false;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overNode = over ? byId.get(String(over.id)) : null;
    const activeNode = active ? byId.get(String(active.id)) : null;
    const isGroupDrop =
      overNode &&
      activeNode &&
      overNode.type === "group" &&
      overNode.parentId !== activeNode.parentId &&
      !isDescendantOf(overNode, activeNode.id);
    setDropGroupId(isGroupDrop ? overNode.id : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDropGroupId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeNode = byId.get(String(active.id));
    const overNode = byId.get(String(over.id));
    if (!activeNode || !overNode) return;
    if (isDescendantOf(overNode, activeNode.id)) return;

    if (overNode.type === "group" && overNode.parentId !== activeNode.parentId) {
      // Dropping onto a group from outside it: insert at the end of the group.
      startTransition(() =>
        moveNode(activeNode.id, overNode.id, overNode.children.length)
      );
      return;
    }

    // Otherwise take the position of the node we dropped on, in its list.
    const targetSiblings = siblingsOf(overNode);
    const overIndex = targetSiblings.findIndex((n) => n.id === overNode.id);
    if (overIndex === -1) return;
    startTransition(() =>
      moveNode(activeNode.id, overNode.parentId, overIndex)
    );
  };

  const addRoot = (type: "group" | "node") =>
    startTransition(async () => {
      const id = await createNode(workspaceId, null, type);
      if (type === "node") onSelect(id);
    });

  const generate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/ai/generate-outline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await res.json()) as {
        proposal?: OutlineProposal;
        error?: string;
      };
      if (!res.ok || !data.proposal) {
        setGenerateError(data.error ?? "Outline generation failed.");
      } else {
        setProposal(data.proposal);
      }
    } catch {
      setGenerateError("Outline generation failed. Is the dev server running?");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="badge text-muted">Outline</h2>
      </div>

      <div className="mt-2 flex-1 px-1">
        {tree.length === 0 ? (
          <p className="px-2 py-4 text-sm leading-relaxed text-muted">
            No outline yet. Add a group or node below, or generate one from
            your sources.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDropGroupId(null)}
          >
            <SortableContext
              items={tree.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul>
                {tree.map((node) => (
                  <TreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    workspaceId={workspaceId}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    dropGroupId={dropGroupId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-hairline bg-surface-soft p-2">
        {generateError && (
          <p className="px-1 text-xs text-error">
            {generateError}
          </p>
        )}
        {!aiConfigured && (
          <p className="px-1 text-xs text-muted">
            Connect an AI provider in{" "}
            <Link href="/settings" className="font-medium text-ink hover:underline">
              Settings
            </Link>{" "}
            to generate outlines.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => addRoot("node")}
            className="btn-utility flex-1"
          >
            <AddIcon className="h-3.5 w-3.5" weight="bold" />
            Node
          </button>
          <button
            onClick={() => addRoot("group")}
            className="btn-utility flex-1"
          >
            <AddIcon className="h-3.5 w-3.5" weight="bold" />
            Group
          </button>
        </div>
        <button
          onClick={generate}
          disabled={generating || !hasReadySources || !aiConfigured}
          title={
            !aiConfigured
              ? "Connect an AI provider in Settings first"
              : hasReadySources
                ? undefined
                : "Add a source first to generate an outline"
          }
          className="btn-primary w-full gap-1.5 px-2 py-1.5 text-xs"
        >
          <ExpandActionIcon className="h-3.5 w-3.5" weight="bold" />
          {generating ? "Generating…" : "Generate outline"}
        </button>
      </div>

      {proposal && (
        <OutlinePreviewDialog
          workspaceId={workspaceId}
          proposal={proposal}
          onClose={() => setProposal(null)}
        />
      )}
    </div>
  );
}

function TreeItem({
  node,
  depth,
  workspaceId,
  selectedId,
  onSelect,
  dropGroupId,
}: {
  node: TreeNode;
  depth: number;
  workspaceId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  dropGroupId: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();
  const isGroup = node.type === "group";
  const isSelected = node.id === selectedId;
  const isDropTarget = dropGroupId === node.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const commitRename = (value: string) => {
    setEditing(false);
    if (value.trim() && value.trim() !== node.title) {
      startTransition(() => renameNode(node.id, value));
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        // Lock dragging to the vertical axis: a lateral x offset would
        // overflow the sidebar and create a horizontal scrollbar.
        transform: CSS.Transform.toString(
          transform ? { ...transform, x: 0 } : null
        ),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
          isDropTarget
            ? "bg-accent/10 outline-2 outline-accent"
            : isSelected
              ? "bg-accent/12 text-ink"
              : "hover:bg-surface-card"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isGroup ? (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-4 shrink-0 items-center justify-center text-muted"
            aria-label={collapsed ? "Expand group" : "Collapse group"}
          >
            {collapsed ? (
              <CollapsedIcon className="h-3.5 w-3.5" weight="bold" />
            ) : (
              <ExpandedIcon className="h-3.5 w-3.5" weight="bold" />
            )}
          </button>
        ) : (
          <span className="flex w-4 shrink-0 items-center justify-center text-muted-soft">
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        )}

        {editing ? (
          <input
            autoFocus
            defaultValue={node.title}
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-1 py-0 text-sm outline-none focus:border-ink"
          />
        ) : (
          <button
            onClick={() => (isGroup ? setCollapsed((c) => !c) : onSelect(node.id))}
            onDoubleClick={() => setEditing(true)}
            className={`min-w-0 flex-1 truncate text-left ${
              isGroup ? "font-medium" : ""
            }`}
            title={node.title}
          >
            {node.title}
          </button>
        )}

        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          {isGroup && (
            <button
              onClick={() =>
                startTransition(async () => {
                  setCollapsed(false);
                  const id = await createNode(workspaceId, node.id, "node");
                  onSelect(id);
                })
              }
              title="Add node inside"
              className="rounded-md p-1 text-muted transition-colors hover:text-ink"
            >
              <AddIcon className="h-3.5 w-3.5" weight="bold" />
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            title="Rename"
            className="rounded-md p-1 text-muted transition-colors hover:text-ink"
          >
            <RenameIcon className="h-3.5 w-3.5" weight="bold" />
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            title="Delete"
            className="rounded-md p-1 text-muted transition-colors hover:text-error"
          >
            <CloseIcon className="h-3.5 w-3.5" weight="bold" />
          </button>
        </span>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={isGroup ? "Delete group?" : "Delete node?"}
        message={
          isGroup
            ? `"${node.title}" and everything inside it will be deleted.`
            : `"${node.title}" and its content will be deleted.`
        }
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          if (isSelected) onSelect(null);
          startTransition(() => deleteNode(node.id));
        }}
      />

      {isGroup && !collapsed && node.children.length > 0 && (
        <SortableContext
          items={node.children.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {node.children.map((child) => (
              <TreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                workspaceId={workspaceId}
                selectedId={selectedId}
                onSelect={onSelect}
                dropGroupId={dropGroupId}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  );
}
