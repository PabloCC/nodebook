import type { OutlineNode } from "@/lib/db/schema";

let counter = 0;

export function makeNode(overrides: Partial<OutlineNode> = {}): OutlineNode {
  counter += 1;
  return {
    id: `node-${counter}`,
    workspaceId: "ws-1",
    parentId: null,
    title: `Node ${counter}`,
    content: "",
    position: 0,
    type: "node",
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}
