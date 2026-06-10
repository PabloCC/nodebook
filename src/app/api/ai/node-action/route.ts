import { streamText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { AiConfigError, getModel } from "@/lib/ai/provider";
import { buildNodeContext, buildSourceContext } from "@/lib/ai/context";
import { nodeActionPrompt, type NodeAction } from "@/lib/ai/prompts";
import { friendlyAiError } from "@/lib/ai/errors";

const ACTIONS: NodeAction[] = [
  "expand",
  "summarize",
  "rewrite",
  "flashcards",
  "ask",
];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    nodeId?: string;
    action?: string;
    question?: string;
  };
  const { workspaceId, nodeId, question } = body;
  const action = body.action as NodeAction;

  if (!workspaceId || !nodeId || !ACTIONS.includes(action)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (action === "ask" && !question?.trim()) {
    return Response.json({ error: "A question is required" }, { status: 400 });
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }
  const nodeCtx = await buildNodeContext(workspaceId, nodeId);
  if (!nodeCtx) {
    return Response.json({ error: "Node not found" }, { status: 404 });
  }

  try {
    const model = await getModel();

    // Summarize only condenses what's already in the node; everything else
    // is grounded in the workspace sources.
    const system =
      action === "summarize"
        ? undefined
        : `Reference material for this workspace:\n\n${await buildSourceContext(workspaceId)}`;

    const result = streamText({
      model,
      system,
      prompt: nodeActionPrompt(action, workspace, nodeCtx, question),
      abortSignal: request.signal,
    });
    return result.toTextStreamResponse();
  } catch (err) {
    if (err instanceof AiConfigError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: friendlyAiError(err) }, { status: 502 });
  }
}
