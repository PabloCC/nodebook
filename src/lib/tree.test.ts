import { describe, it, expect } from "vitest";
import { buildTree, siblingTitles } from "@/lib/tree";
import { makeNode } from "@/test/helpers";

describe("buildTree", () => {
  it("returns [] for an empty list", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("sorts roots by position when given out-of-order input", () => {
    const a = makeNode({ id: "a", position: 2 });
    const b = makeNode({ id: "b", position: 0 });
    const c = makeNode({ id: "c", position: 1 });
    const result = buildTree([a, b, c]);
    expect(result.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("attaches children under the correct parent and sorts them by position", () => {
    const group = makeNode({ id: "g", type: "group", position: 0 });
    const child1 = makeNode({ id: "c1", parentId: "g", position: 2 });
    const child2 = makeNode({ id: "c2", parentId: "g", position: 0 });
    const result = buildTree([group, child1, child2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g");
    expect(result[0].children.map((n) => n.id)).toEqual(["c2", "c1"]);
  });

  it("treats a node with a missing parentId as a root", () => {
    const orphan = makeNode({ id: "orphan", parentId: "does-not-exist" });
    const result = buildTree([orphan]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("orphan");
  });
});

describe("siblingTitles", () => {
  it("returns titles of same-parent siblings sorted by position, excluding the target", () => {
    const a = makeNode({ id: "a", title: "Alpha", position: 2 });
    const b = makeNode({ id: "b", title: "Beta", position: 0 });
    const c = makeNode({ id: "c", title: "Gamma", position: 1 });
    const result = siblingTitles([a, b, c], "a");
    expect(result).toEqual(["Beta", "Gamma"]);
  });

  it("returns [] for an unknown nodeId", () => {
    const n = makeNode({ id: "x" });
    expect(siblingTitles([n], "not-present")).toEqual([]);
  });

  it("returns [] when the node has no siblings", () => {
    const n = makeNode({ id: "solo" });
    expect(siblingTitles([n], "solo")).toEqual([]);
  });

  it("only returns siblings with the same parent, not cousins", () => {
    const group1 = makeNode({ id: "g1", type: "group" });
    const group2 = makeNode({ id: "g2", type: "group" });
    const child1 = makeNode({ id: "ch1", parentId: "g1", title: "Child1", position: 0 });
    const child2 = makeNode({ id: "ch2", parentId: "g1", title: "Child2", position: 1 });
    const cousin = makeNode({ id: "co", parentId: "g2", title: "Cousin", position: 0 });
    const result = siblingTitles([group1, group2, child1, child2, cousin], "ch1");
    expect(result).toEqual(["Child2"]);
  });
});
