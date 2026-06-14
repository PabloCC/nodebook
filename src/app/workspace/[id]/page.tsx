import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nodes, sources, workspaces } from "@/lib/db/schema";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { reconcileStaleSources } from "@/lib/sources";
import { getNodeSourceMap } from "@/lib/attribution";
import { getAppSettings, isProviderConfigured } from "@/lib/settings";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id));
  if (!workspace) notFound();

  await reconcileStaleSources(id);

  const [allNodes, allSources, nodeSourceMap, settings] = await Promise.all([
    db
      .select()
      .from(nodes)
      .where(eq(nodes.workspaceId, id))
      .orderBy(asc(nodes.position)),
    db
      .select()
      .from(sources)
      .where(eq(sources.workspaceId, id))
      .orderBy(asc(sources.createdAt)),
    getNodeSourceMap(id),
    getAppSettings(),
  ]);

  return (
    <WorkspaceShell
      workspace={workspace}
      nodes={allNodes}
      sources={allSources}
      nodeSourceMap={nodeSourceMap}
      aiConfigured={isProviderConfigured(settings)}
    />
  );
}
