import { apiError, bootstrapWorkspace, json, readBody } from "@/lib/server-api";
import { ACCESS_VERSION } from "@/lib/access-protocol";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const workspace = await bootstrapWorkspace(request, body.browserToken);
    return json({ workspaceId: workspace.id, protocolVersion: ACCESS_VERSION, transport: "json-body" });
  } catch (error) { return apiError(error); }
}
