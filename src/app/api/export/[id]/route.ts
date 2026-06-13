import JSZip from "jszip";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, workspaces } from "@/lib/db/schema";
import { buildTree } from "@/lib/tree";
import { slugifyTitle, workspaceExportFiles } from "@/lib/export";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const zip = new JSZip();
  for (const file of workspaceExportFiles(buildTree(allNodes))) {
    zip.file(file.path, file.content);
  }
  const archive = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slugifyTitle(workspace.name)}.zip"`,
    },
  });
}
