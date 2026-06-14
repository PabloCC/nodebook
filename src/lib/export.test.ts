import { describe, it, expect } from "vitest";
import type { TreeNode } from "@/lib/tree";
import {
  slugifyTitle,
  workspaceExportFiles,
  workspaceTableOfContents,
} from "@/lib/export";

const NOW = Date.now();
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

  it("appends a node's flashcards under a single ## Flashcards heading", () => {
    const withHeading = makeNode(
      "A",
      "node",
      [],
      "Body.",
      "## Flashcards\n\n**Q: q1**\nA: a1"
    );
    expect(workspaceExportFiles([withHeading])[0].content).toBe(
      "# A\n\nBody.\n\n## Flashcards\n\n**Q: q1**\nA: a1\n"
    );

    // Stored text without a heading gets one added (no duplication).
    const noHeading = makeNode("B", "node", [], "Body.", "**Q: q1**\nA: a1");
    expect(workspaceExportFiles([noHeading])[0].content).toBe(
      "# B\n\nBody.\n\n## Flashcards\n\n**Q: q1**\nA: a1\n"
    );
  });
});

describe("workspaceTableOfContents", () => {
  it("renders an indented outline linking nodes to their files", () => {
    const tree = [
      makeNode("Getting Started", "group", [
        makeNode("Installing Python", "node"),
        makeNode("Hello World", "node"),
      ]),
      makeNode("Closing Notes", "node"),
    ];

    expect(workspaceTableOfContents(tree, "My Course")).toBe(
      [
        "# My Course",
        "",
        "- **Getting Started**",
        "  - [Installing Python](01-getting-started/01-installing-python.md)",
        "  - [Hello World](01-getting-started/02-hello-world.md)",
        "- [Closing Notes](02-closing-notes.md)",
        "",
      ].join("\n")
    );
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
