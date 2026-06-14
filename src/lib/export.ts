import type { TreeNode } from "@/lib/tree";

const MAX_SLUG_LENGTH = 60;

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
  return slug || "untitled";
}

export type ExportFile = { path: string; content: string };

// Numeric-prefixed slug for a node at sibling index `i` — shared by the file
// walk and the table of contents so their paths always agree.
function entryName(title: string, i: number): string {
  return `${String(i + 1).padStart(2, "0")}-${slugifyTitle(title)}`;
}

// A node's markdown file: title heading, content, then its flashcards (if any)
// under a `## Flashcards` heading. Empty content/flashcards collapse cleanly.
function nodeMarkdown(node: TreeNode): string {
  let out = `# ${node.title}\n\n${node.content}`.trimEnd();
  const cards = node.flashcards?.trim();
  if (cards) {
    const section = /^##\s+flashcards\s*$/im.test(cards)
      ? cards
      : `## Flashcards\n\n${cards}`;
    out = `${out}\n\n${section}`.trimEnd();
  }
  return out + "\n";
}

export function workspaceExportFiles(tree: TreeNode[]): ExportFile[] {
  const files: ExportFile[] = [];

  const walk = (siblings: TreeNode[], prefix: string) => {
    siblings.forEach((node, i) => {
      const name = entryName(node.title, i);
      if (node.type === "group") {
        // Groups never carry content (the editor refuses to edit them), so a
        // group only appears in the zip through its descendant files; an
        // empty group exports nothing.
        walk(node.children, `${prefix}${name}/`);
      } else {
        files.push({ path: `${prefix}${name}.md`, content: nodeMarkdown(node) });
      }
    });
  };

  walk(tree, "");
  return files;
}

// Root README.md: an indented outline with links to each node file. Group/node
// numbering mirrors `workspaceExportFiles`, so links resolve inside the zip.
export function workspaceTableOfContents(
  tree: TreeNode[],
  title = "Contents"
): string {
  const lines: string[] = [];

  const walk = (siblings: TreeNode[], prefix: string, depth: number) => {
    siblings.forEach((node, i) => {
      const name = entryName(node.title, i);
      const indent = "  ".repeat(depth);
      if (node.type === "group") {
        lines.push(`${indent}- **${node.title}**`);
        walk(node.children, `${prefix}${name}/`, depth + 1);
      } else {
        lines.push(`${indent}- [${node.title}](${prefix}${name}.md)`);
      }
    });
  };

  walk(tree, "", 0);
  return `# ${title}\n\n${lines.join("\n")}\n`;
}
