import { describe, it, expect } from "vitest";
import { nodeActionPrompt, type NodeContext } from "@/lib/ai/prompts";
import type { Workspace } from "@/lib/db/schema";

const workspace: Workspace = {
  id: "ws-1",
  name: "Test",
  type: "study" as const,
  createdAt: 0,
};

const ctx: NodeContext = {
  title: "T",
  content: "",
  groupTitle: null,
  siblingTitles: [],
};

const ctxWithContent: NodeContext = {
  ...ctx,
  content: "Some existing content.",
};

describe("nodeActionPrompt — grounding note", () => {
  it("expand with hasSources: true (default) → contains grounding note", () => {
    const prompt = nodeActionPrompt("expand", workspace, ctx);
    expect(prompt).toContain("Ground everything in the provided sources");
  });

  it("expand with hasSources: false → contains no-sources note, not grounding note", () => {
    const prompt = nodeActionPrompt("expand", workspace, ctx, undefined, false);
    expect(prompt).toContain("This workspace has no sources attached");
    expect(prompt).not.toContain("Ground everything in the provided sources");
  });

  it("rewrite with hasSources: true → contains grounding note", () => {
    const prompt = nodeActionPrompt("rewrite", workspace, ctxWithContent);
    expect(prompt).toContain("Ground everything in the provided sources");
  });

  it("rewrite with hasSources: false → contains no-sources note, not grounding note", () => {
    const prompt = nodeActionPrompt("rewrite", workspace, ctxWithContent, undefined, false);
    expect(prompt).toContain("This workspace has no sources attached");
    expect(prompt).not.toContain("Ground everything in the provided sources");
  });

  it("ask with hasSources: true → contains grounding note", () => {
    const prompt = nodeActionPrompt("ask", workspace, ctx, "What is this?");
    expect(prompt).toContain("Ground everything in the provided sources");
  });

  it("ask with hasSources: false → contains no-sources note, not grounding note", () => {
    const prompt = nodeActionPrompt("ask", workspace, ctx, "What is this?", false);
    expect(prompt).toContain("This workspace has no sources attached");
    expect(prompt).not.toContain("Ground everything in the provided sources");
  });
});

describe("nodeActionPrompt — flashcards empty-content hint", () => {
  it("flashcards with empty content and hasSources: false → contains general knowledge hint", () => {
    const prompt = nodeActionPrompt("flashcards", workspace, ctx, undefined, false);
    expect(prompt).toContain("use your general knowledge of this topic");
  });

  it("flashcards with empty content and hasSources: true → contains sources hint", () => {
    const prompt = nodeActionPrompt("flashcards", workspace, ctx);
    expect(prompt).toContain("use the sources for this topic instead");
  });

  it("flashcards with non-empty content → no empty-content hint regardless of hasSources", () => {
    const prompt = nodeActionPrompt("flashcards", workspace, ctxWithContent, undefined, false);
    expect(prompt).not.toContain("use your general knowledge of this topic");
    expect(prompt).not.toContain("use the sources for this topic instead");
  });
});

describe("nodeActionPrompt — summarize", () => {
  it("summarize → contains neither grounding sentence, regardless of hasSources", () => {
    const promptWithSources = nodeActionPrompt("summarize", workspace, ctxWithContent);
    const promptWithout = nodeActionPrompt("summarize", workspace, ctxWithContent, undefined, false);
    for (const prompt of [promptWithSources, promptWithout]) {
      expect(prompt).not.toContain("Ground everything in the provided sources");
      expect(prompt).not.toContain("This workspace has no sources attached");
    }
  });
});

describe("nodeActionPrompt — sibling wiring", () => {
  it("with siblingTitles, prompt contains sibling list", () => {
    const ctxWithSiblings: NodeContext = {
      ...ctx,
      siblingTitles: ["A", "B"],
    };
    const prompt = nodeActionPrompt("expand", workspace, ctxWithSiblings);
    expect(prompt).toContain("Other nodes in the same section");
  });
});
