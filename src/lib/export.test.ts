import { describe, it, expect } from "vitest";
import type { TreeNode } from "@/lib/tree";
import { slugifyTitle, workspaceExportFiles } from "@/lib/export";

const NOW = Date.now();
let counter = 0;

function makeNode(
  title: string,
  type: "group" | "node",
  children: TreeNode[] = [],
  content = ""
): TreeNode {
  counter += 1;
  return {
    id: `n-${counter}`,
    workspaceId: "ws-1",
    parentId: null,
    title,
    content,
    flashcards: "",
    position: 0,
    type,
    createdAt: NOW,
    updatedAt: NOW,
    children,
  };
}

describe("slugifyTitle", () => {
  it("lowercases and replaces unsafe characters with hyphens", () => {
    expect(slugifyTitle('Intro / Setup: "Hello, World!"')).toBe(
      "intro-setup-hello-world"
    );
  });

  it("falls back to untitled for empty or symbol-only titles", () => {
    expect(slugifyTitle("")).toBe("untitled");
    expect(slugifyTitle("???///")).toBe("untitled");
  });

  it("caps length at 60 characters without a trailing hyphen", () => {
    const slug = slugifyTitle("a".repeat(59) + " trailing words here");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("workspaceExportFiles", () => {
  it("maps groups to folders and nodes to numbered markdown files", () => {
    const tree = [
      makeNode("Getting Started", "group", [
        makeNode("Installing Python", "node", [], "Use the installer."),
        makeNode("Hello World", "node", [], "print('hi')"),
      ]),
      makeNode("Closing Notes", "node", [], "The end."),
    ];

    expect(workspaceExportFiles(tree).map((f) => f.path)).toEqual([
      "01-getting-started/01-installing-python.md",
      "01-getting-started/02-hello-world.md",
      "02-closing-notes.md",
    ]);
  });

  it("keeps duplicate sibling titles distinct via numeric prefixes", () => {
    const tree = [
      makeNode("Intro", "node"),
      makeNode("Intro", "node"),
    ];

    expect(workspaceExportFiles(tree).map((f) => f.path)).toEqual([
      "01-intro.md",
      "02-intro.md",
    ]);
  });

  it("starts file content with the original title heading and preserves the body", () => {
    const tree = [
      makeNode("Loops & Iteration", "node", [], "## While loops\n\nKeep going."),
    ];

    const [file] = workspaceExportFiles(tree);
    expect(file.content).toBe(
      "# Loops & Iteration\n\n## While loops\n\nKeep going.\n"
    );
  });

  it("exports empty-content nodes with just the heading", () => {
    const tree = [makeNode("Stub", "node")];
    expect(workspaceExportFiles(tree)[0].content).toBe("# Stub\n");
  });

  it("skips empty groups and nests folders for groups inside groups", () => {
    const tree = [
      makeNode("Empty Module", "group"),
      makeNode("Outer", "group", [
        makeNode("Inner", "group", [makeNode("Deep Topic", "node")]),
      ]),
    ];

    expect(workspaceExportFiles(tree).map((f) => f.path)).toEqual([
      "02-outer/01-inner/01-deep-topic.md",
    ]);
  });
});
