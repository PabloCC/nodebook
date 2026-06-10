import type { OutlineNode } from "@/lib/db/schema";

export type TreeNode = OutlineNode & { children: TreeNode[] };

export function buildTree(flat: OutlineNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const node of flat) byId.set(node.id, { ...node, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const byPosition = (a: TreeNode, b: TreeNode) => a.position - b.position;
  for (const node of byId.values()) node.children.sort(byPosition);
  roots.sort(byPosition);
  return roots;
}

export function siblingTitles(flat: OutlineNode[], nodeId: string): string[] {
  const node = flat.find((n) => n.id === nodeId);
  if (!node) return [];
  return flat
    .filter((n) => n.parentId === node.parentId && n.id !== nodeId)
    .sort((a, b) => a.position - b.position)
    .map((n) => n.title);
}
