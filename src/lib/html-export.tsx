import { createElement } from "react";
// `react-dom/server.edge` (not the bare `react-dom/server`, which Next blocks
// in the App Router graph) exposes renderToStaticMarkup for the Node route.
import { renderToStaticMarkup } from "react-dom/server.edge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Source, Workspace } from "@/lib/db/schema";
import type { TreeNode } from "@/lib/tree";
import { slugifyTitle } from "@/lib/export";
import { parseFlashcards } from "@/lib/flashcards";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!
  );
}

// Markdown → safe HTML, reusing the same renderer the app uses on screen.
// react-markdown escapes raw HTML by default, so node content can't inject markup.
function markdownToHtml(content: string): string {
  if (!content.trim()) return "";
  return renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, content)
  );
}

const STYLES = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0; background: #fbfbfa; color: #20201e;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.65;
}
.wrap { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.2; color: #20201e; }
header h1 { font-size: 2.4rem; margin: 0.2rem 0 0; }
.kicker { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; font-weight: 600; color: #78756e; margin: 0; }
nav { margin: 2.5rem 0; padding: 1.25rem 1.5rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #fff; }
nav h2 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #78756e; margin: 0 0 0.75rem; }
nav ul { list-style: none; margin: 0; padding-left: 1rem; }
nav > ul.toc { padding-left: 0; }
nav .grp { font-weight: 600; }
nav a { color: #20201e; text-decoration: none; }
nav a:hover { text-decoration: underline; }
section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(0,0,0,0.06); }
section:first-of-type { border-top: none; }
section h2 { font-size: 1.6rem; margin: 0 0 0.5rem; }
.content :where(pre) { background: #f5f4f1; padding: 0.9rem 1rem; border-radius: 8px; overflow: auto; }
.content :where(code) { font-family: ui-monospace, "SF Mono", monospace; font-size: 0.9em; }
.content :where(a) { color: #a8573e; }
.sources { font-size: 0.8rem; color: #78756e; margin: 0 0 1rem; }
.cards { margin-top: 1.75rem; }
.cards h3 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #78756e; }
.cards details { border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 0.6rem 0.9rem; margin-bottom: 0.5rem; background: #fff; }
.cards summary { cursor: pointer; font-weight: 500; }
@media print { nav { break-inside: avoid; } section { break-inside: avoid; } }
`;

export function renderWorkspaceHtml({
  workspace,
  tree,
  sources,
  nodeSourceMap,
}: {
  workspace: Workspace;
  tree: TreeNode[];
  sources: Source[];
  nodeSourceMap: Record<string, string[]>;
}): string {
  const sourceById = new Map(sources.map((s) => [s.id, s] as const));
  const toc: string[] = [];
  const sections: string[] = [];
  let counter = 0;

  const walk = (siblings: TreeNode[]) => {
    for (const node of siblings) {
      if (node.type === "group") {
        toc.push(`<li><span class="grp">${escapeHtml(node.title)}</span><ul>`);
        walk(node.children);
        toc.push(`</ul></li>`);
        continue;
      }

      const id = `n${++counter}-${slugifyTitle(node.title)}`;
      toc.push(`<li><a href="#${id}">${escapeHtml(node.title)}</a></li>`);

      const titles = (nodeSourceMap[node.id] ?? [])
        .map((sid) => sourceById.get(sid)?.title)
        .filter((t): t is string => Boolean(t));
      const citations = titles.length
        ? `<p class="sources">Sources: ${titles.map(escapeHtml).join(", ")}</p>`
        : "";

      const cards = parseFlashcards(node.flashcards);
      const cardsHtml = cards.length
        ? `<div class="cards"><h3>Flashcards</h3>${cards
            .map(
              (c) =>
                `<details><summary>${escapeHtml(c.question)}</summary><div>${markdownToHtml(c.answer)}</div></details>`
            )
            .join("")}</div>`
        : "";

      sections.push(
        `<section id="${id}"><h2>${escapeHtml(node.title)}</h2>${citations}<div class="content">${markdownToHtml(node.content)}</div>${cardsHtml}</section>`
      );
    }
  };
  walk(tree);

  const kicker = workspace.type === "course" ? "Course" : "Study";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(workspace.name)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
<header><p class="kicker">${kicker}</p><h1>${escapeHtml(workspace.name)}</h1></header>
<nav><h2>Contents</h2><ul class="toc">${toc.join("")}</ul></nav>
<main>${sections.join("")}</main>
</div>
</body>
</html>`;
}
