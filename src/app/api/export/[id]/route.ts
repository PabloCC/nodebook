import JSZip from "jszip";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, sources, workspaces } from "@/lib/db/schema";
import { buildTree } from "@/lib/tree";
import {
  slugifyTitle,
  workspaceExportFiles,
  workspaceTableOfContents,
} from "@/lib/export";
import { renderWorkspaceHtml } from "@/lib/html-export";
import { getNodeSourceMap } from "@/lib/attribution";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id));
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  const allNodes = await db
    .select()
    .from(nodes)
    .where(eq(nodes.workspaceId, id))
    .orderBy(asc(nodes.position));
  const tree = buildTree(allNodes);
  const filename = slugifyTitle(workspace.name);

  // Self-contained HTML — one shareable, printable file.
  if (format === "html") {
    const [allSources, nodeSourceMap] = await Promise.all([
      db.select().from(sources).where(eq(sources.workspaceId, id)),
      getNodeSourceMap(id),
    ]);
    const html = renderWorkspaceHtml({
      workspace,
      tree,
      sources: allSources,
      nodeSourceMap,
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });
  }

  // Default: markdown folder zip.
  const zip = new JSZip();
  zip.file("README.md", workspaceTableOfContents(tree, workspace.name));
  for (const file of workspaceExportFiles(tree)) {
    zip.file(file.path, file.content);
  }
  const archive = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}.zip"`,
    },
  });
}
