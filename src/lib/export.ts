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

export function workspaceExportFiles(tree: TreeNode[]): ExportFile[] {
  const files: ExportFile[] = [];

  const walk = (siblings: TreeNode[], prefix: string) => {
    siblings.forEach((node, i) => {
      const name = `${String(i + 1).padStart(2, "0")}-${slugifyTitle(node.title)}`;
      if (node.type === "group") {
        // Groups never carry content (the editor refuses to edit them), so a
        // group only appears in the zip through its descendant files; an
        // empty group exports nothing.
        walk(node.children, `${prefix}${name}/`);
      } else {
        files.push({
          path: `${prefix}${name}.md`,
          content: `# ${node.title}\n\n${node.content}`.trimEnd() + "\n",
        });
      }
    });
  };

  walk(tree, "");
  return files;
}
