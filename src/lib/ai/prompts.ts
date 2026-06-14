import type { Workspace } from "@/lib/db/schema";

export type NodeAction =
  | "expand"
  | "summarize"
  | "rewrite"
  | "flashcards"
  | "ask";

export type NodeContext = {
  title: string;
  content: string;
  groupTitle: string | null;
  siblingTitles: string[];
};

export function outlinePrompt(workspace: Workspace, sourceContext: string) {
  const audience =
    workspace.type === "course"
      ? "a course to teach others"
      : "a personal study plan";
  return `You are a curriculum designer. The user is building ${audience} called "${workspace.name}".

Based on the following sources, design a structured outline: groups (modules or topic sections) containing nodes (lessons or topics). Each node needs a title and a one-or-two sentence description of what it covers. For each node, set sourceRefs to the id values of the sources (from the SOURCES list below) that the node draws on. Cover the material in the sources thoroughly and in a logical learning order. Aim for 3-8 groups with 2-6 nodes each, scaled to the amount of material.

SOURCES:
${sourceContext}`;
}

function outlinePosition(ctx: NodeContext) {
  const parts = [`The node is titled "${ctx.title}".`];
  if (ctx.groupTitle) parts.push(`It belongs to the section "${ctx.groupTitle}".`);
  if (ctx.siblingTitles.length > 0) {
    parts.push(
      `Other nodes in the same section: ${ctx.siblingTitles.map((t) => `"${t}"`).join(", ")}. Do not cover their material — stay focused on this node's topic.`
    );
  }
  return parts.join(" ");
}

export function nodeActionPrompt(
  action: NodeAction,
  workspace: Workspace,
  ctx: NodeContext,
  question?: string,
  hasSources = true
): string {
  const audience =
    workspace.type === "course" ? "course students" : "a student studying this material";
  const position = outlinePosition(ctx);
  const sourcesNote = hasSources
    ? "Ground everything in the provided sources. If the sources do not cover something, say so rather than inventing facts."
    : "This workspace has no sources attached. Write from your general knowledge of the topic, and flag anything you are not certain about.";

  switch (action) {
    case "expand":
      return `You are writing educational content for ${audience}. ${position}

${ctx.content.trim() ? `The node currently contains:\n\n${ctx.content}\n\nWrite the next section(s) that naturally continue and deepen this content. Do not repeat what is already there.` : "The node is currently empty. Write its content from scratch."}

${sourcesNote} Return well-structured markdown (use ## headings, lists, examples). Return only the new content, no preamble.`;
    case "summarize":
      return `You are condensing study material for ${audience}. ${position}

Summarize the following node content into its essential points. Keep it sharp and scannable: short paragraphs or bullet points, bold key terms. Return only the summary as markdown, no preamble.

CONTENT:
${ctx.content}`;
    case "rewrite":
      return `You are writing educational content for ${audience}. ${position}

Rewrite this node's content from scratch using the sources as ground truth. Improve structure, clarity, and completeness. ${sourcesNote} Return well-structured markdown (## headings, lists, examples). Return only the content, no preamble.

CURRENT CONTENT (for reference only):
${ctx.content}`;
    case "flashcards":
      return `You are creating flashcards for ${audience}. ${position}

From the node content below${ctx.content.trim() ? "" : hasSources ? " (empty — use the sources for this topic instead)" : " (empty — use your general knowledge of this topic)"}, produce 5-12 question/answer flashcards as a markdown section in exactly this format:

## Flashcards

**Q: <question>**
A: <answer>

Each card is one **Q: ...** line immediately followed by one A: ... line, with a single blank line between cards. Do not number the cards or add any other preamble. Make questions test understanding, not trivia. Return only the flashcards section.

CONTENT:
${ctx.content}`;
    case "ask":
      return `You are a tutor helping ${audience}. ${position}

Answer the user's question about this node's topic. ${sourcesNote} Be direct and concise; use markdown if structure helps.

NODE CONTENT:
${ctx.content}

QUESTION: ${question ?? ""}`;
  }
}
