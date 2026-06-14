// Inverse of `workspaceExportFiles` (src/lib/export.ts): reconstruct an outline
// from an exported markdown zip's files. Folders become groups, `NN-slug.md`
// files become nodes. Node titles come from the leading `# ` heading; a
// `## Flashcards` section is split back out into the node's flashcards.

export type ImportedNode = {
  type: "group" | "node";
  title: string;
  content: string;
  flashcards: string;
  children: ImportedNode[];
};

export type ImportFile = { path: string; content: string };

const stripPrefix = (segment: string) => segment.replace(/^\d+-/, "");

// "getting-started" → "Getting Started". Group titles aren't stored anywhere
// but the folder slug, so this is a best-effort restoration (case/punctuation
// from the original title are not recoverable).
function deslug(slug: string): string {
  return stripPrefix(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .trim();
}

function parseNodeFile(fileName: string, raw: string): ImportedNode {
  const lines = raw.split("\n");
  let title = deslug(fileName.replace(/\.md$/i, ""));
  let bodyStart = 0;
  const heading = /^#\s+(.+)$/.exec((lines[0] ?? "").trim());
  if (heading) {
    title = heading[1].trim();
    bodyStart = 1;
  }

  const rest = lines.slice(bodyStart).join("\n").trim();
  let content = rest;
  let flashcards = "";
  const fc = /^##\s+flashcards\s*$/im.exec(rest);
  if (fc) {
    content = rest.slice(0, fc.index).trim();
    flashcards = rest.slice(fc.index).trim(); // keep the heading
  }

  return { type: "node", title, content, flashcards, children: [] };
}

export function parseWorkspaceImport(files: ImportFile[]): ImportedNode[] {
  const mdFiles = files
    .filter((f) => /\.md$/i.test(f.path))
    .filter((f) => f.path.split("/").pop()?.toLowerCase() !== "readme.md")
    .sort((a, b) => a.path.localeCompare(b.path));

  const roots: ImportedNode[] = [];
  const groupByPath = new Map<string, ImportedNode>();

  // Ensure the group chain for `segments` exists; return its children array.
  const containerFor = (segments: string[]): ImportedNode[] => {
    let container = roots;
    let key = "";
    for (const seg of segments) {
      key = key ? `${key}/${seg}` : seg;
      let group = groupByPath.get(key);
      if (!group) {
        group = {
          type: "group",
          title: deslug(seg),
          content: "",
          flashcards: "",
          children: [],
        };
        groupByPath.set(key, group);
        container.push(group);
      }
      container = group.children;
    }
    return container;
  };

  for (const file of mdFiles) {
    const segments = file.path.split("/");
    const fileName = segments.pop()!;
    containerFor(segments).push(parseNodeFile(fileName, file.content));
  }

  return roots;
}
