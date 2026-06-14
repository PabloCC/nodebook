// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import type { Source, Workspace } from "@/lib/db/schema";
import type { TreeNode } from "@/lib/tree";
import { renderWorkspaceHtml } from "@/lib/html-export";

const workspace: Workspace = {
  id: "ws-1",
  name: "Algebra Basics",
  type: "study",
  createdAt: 0,
};

function node(partial: Partial<TreeNode> & { title: string }): TreeNode {
  return {
    id: partial.id ?? partial.title,
    workspaceId: "ws-1",
    parentId: null,
    title: partial.title,
    content: partial.content ?? "",
    flashcards: partial.flashcards ?? "",
    position: 0,
    type: partial.type ?? "node",
    createdAt: 0,
    updatedAt: 0,
    children: partial.children ?? [],
  };
}

describe("renderWorkspaceHtml", () => {
  it("produces a self-contained document with TOC, rendered content, citations, and flashcards", () => {
    const sources: Source[] = [
      {
        id: "s1",
        workspaceId: "ws-1",
        type: "pdf",
        title: "Textbook.pdf",
        originalRef: null,
        content: "",
        status: "ready",
        errorMessage: null,
        createdAt: 0,
      },
    ];
    const tree: TreeNode[] = [
      node({
        title: "Equations",
        type: "group",
        children: [
          node({
            id: "n1",
            title: "Linear Equations",
            content: "Solve **ax + b = 0**.",
            flashcards: "**Q: what is x?**\nA: -b/a",
          }),
        ],
      }),
    ];

    const html = renderWorkspaceHtml({
      workspace,
      tree,
      sources,
      nodeSourceMap: { n1: ["s1"] },
    });

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Algebra Basics</title>");
    expect(html).toContain("<style>"); // self-contained, inline styles
    // TOC links to the node section
    expect(html).toContain('href="#n1-linear-equations"');
    expect(html).toContain('id="n1-linear-equations"');
    // markdown rendered to HTML
    expect(html).toContain("<strong>ax + b = 0</strong>");
    // citation + flashcard
    expect(html).toContain("Sources: Textbook.pdf");
    expect(html).toContain("<summary>what is x?</summary>");
  });

  it("escapes HTML in titles", () => {
    const html = renderWorkspaceHtml({
      workspace: { ...workspace, name: "Tom & <Jerry>" },
      tree: [],
      sources: [],
      nodeSourceMap: {},
    });
    expect(html).toContain("<title>Tom &amp; &lt;Jerry&gt;</title>");
  });
});
