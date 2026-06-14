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
    // is grounded in the workspace sources (when there are any).
    const sourceContext =
      action === "summarize"
        ? { text: "", sourceIds: [] }
        : await buildSourceContext(workspaceId);
    const system = sourceContext.text
      ? `Reference material for this workspace:\n\n${sourceContext.text}`
      : undefined;

    const result = streamText({
      model,
      system,
      prompt: nodeActionPrompt(
        action,
        workspace,
        nodeCtx,
        question,
        Boolean(sourceContext.text)
      ),
      abortSignal: request.signal,
    });
    // Surface which sources grounded this response so the client can attribute
    // the node on accept (header, since the body is a plain text stream).
    return result.toTextStreamResponse({
      headers: { "X-Source-Ids": sourceContext.sourceIds.join(",") },
    });
  } catch (err) {
    if (err instanceof AiConfigError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: friendlyAiError(err) }, { status: 502 });
  }
}
