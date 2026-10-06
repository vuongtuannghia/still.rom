import { assertAdmin } from "@/lib/admin";
import { requireAccount } from "@/lib/community-auth";
import { apiError, json } from "@/lib/server-api";
import { getAiCompanyStatus, runAiCompany } from "@/lib/ai-company";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const current = await requireAccount(request);
    assertAdmin(current);
    return json(getAiCompanyStatus());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireAccount(request);
    assertAdmin(current);

    const body = await request.json().catch(() => ({}));
    const result = await runAiCompany(String(body.task || ""));
    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
