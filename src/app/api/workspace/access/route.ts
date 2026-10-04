import { apiError, getWorkspace, json, readBody } from "@/lib/server-api";
import { workspaceGrant } from "@/lib/access-protocol";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await readBody(request);
    const workspace = await getWorkspace(request);
    return json({ access: workspaceGrant(workspace.id) });
  } catch (error) { return apiError(error); }
}
