import { searchNodes } from "@/lib/search";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId");
  const q = params.get("q") ?? "";

  if (!workspaceId) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  return Response.json({ results: await searchNodes(workspaceId, q) });
}
