import { describe, it, expect } from "vitest";
import type { TreeNode } from "@/lib/tree";
import { workspaceExportFiles } from "@/lib/export";
import { parseWorkspaceImport, type ImportedNode } from "@/lib/import";

let counter = 0;
function makeNode(
  title: string,
  type: "group" | "node",
  children: TreeNode[] = [],
  content = "",
  flashcards = ""
): TreeNode {
  counter += 1;
  return {
    id: `n-${counter}`,
    workspaceId: "ws-1",
    parentId: null,
    title,
    content,
    flashcards,
    position: 0,
    type,
    createdAt: 0,
    updatedAt: 0,
    children,
  };
}

// Compare just the importable shape (export drops ids/positions/timestamps).
function shape(n: ImportedNode): unknown {
  return {
    type: n.type,
    title: n.title,
    content: n.content,
    flashcards: n.flashcards,
    children: n.children.map(shape),
  };
}

describe("parseWorkspaceImport", () => {
  it("round-trips structure, node titles, content, and flashcards from an export", () => {
    const tree = [
      makeNode("Getting Started", "group", [
        makeNode("Installing Python", "node", [], "Use the installer."),
        makeNode(
          "Hello World",
          "node",
          [],
          "print('hi')",
          "## Flashcards\n\n**Q: how to print?**\nA: print()"
        ),
      ]),
      makeNode("Closing Notes", "node", [], "The end."),
    ];

    const files = workspaceExportFiles(tree);
    const imported = parseWorkspaceImport(files);

    expect(imported.map(shape)).toEqual([
      {
        type: "group",
        title: "Getting Started",
        content: "",
        flashcards: "",
        children: [
          {
            type: "node",
            title: "Installing Python",
            content: "Use the installer.",
            flashcards: "",
            children: [],
          },
          {
            type: "node",
            title: "Hello World",
            content: "print('hi')",
            flashcards: "## Flashcards\n\n**Q: how to print?**\nA: print()",
            children: [],
          },
        ],
      },
      {
        type: "node",
        title: "Closing Notes",
        content: "The end.",
        flashcards: "",
        children: [],
      },
    ]);
  });

  it("ignores README.md and non-markdown entries", () => {
    const imported = parseWorkspaceImport([
      { path: "README.md", content: "# Contents\n\n- x" },
      { path: "cover.png", content: "binary" },
      { path: "01-intro.md", content: "# Intro\n\nHello." },
    ]);
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({ type: "node", title: "Intro" });
  });

  it("falls back to a de-slugged filename when a node has no heading", () => {
    const imported = parseWorkspaceImport([
      { path: "03-loops-and-iteration.md", content: "Body only." },
    ]);
    expect(imported[0].title).toBe("Loops And Iteration");
    expect(imported[0].content).toBe("Body only.");
  });
});
