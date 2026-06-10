import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { AiConfigError, getModel } from "@/lib/ai/provider";
import { buildSourceContext } from "@/lib/ai/context";
import { outlinePrompt } from "@/lib/ai/prompts";
import { outlineProposalSchema } from "@/lib/ai/outline-schema";
import { friendlyAiError } from "@/lib/ai/errors";

export async function POST(request: Request) {
  const { workspaceId } = (await request.json()) as { workspaceId?: string };
  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  const sourceContext = await buildSourceContext(workspaceId);
  if (!sourceContext) {
    return Response.json(
      { error: "Add at least one processed source before generating an outline." },
      { status: 400 }
    );
  }

  try {
    const model = await getModel();
    const { object } = await generateObject({
      model,
      schema: outlineProposalSchema,
      prompt: outlinePrompt(workspace, sourceContext),
    });
    return Response.json({ proposal: object });
  } catch (err) {
    if (err instanceof AiConfigError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: friendlyAiError(err) }, { status: 502 });
  }
}
