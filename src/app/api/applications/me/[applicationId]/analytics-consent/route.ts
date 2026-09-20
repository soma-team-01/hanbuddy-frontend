import { NextRequest } from "next/server";
import {
  analyticsBackendOptions,
  analyticsUnavailableResponse,
  createProjectedAnalyticsResponse,
  readAnalyticsJson,
  readServerAnalyticsPolicy,
  validateAnalyticsRequest,
} from "@/app/api/_utils/analytics-bff";
import { getAccessToken, unauthorizedResponse } from "@/app/api/_utils/authenticated-backend";
import { postBackend } from "@/lib/auth/backend";

export const dynamic = "force-dynamic";

interface ConsentRouteContext {
  params: Promise<{ applicationId: string }>;
}

interface ConsentResult {
  registered: boolean;
}

export async function POST(request: NextRequest, context: ConsentRouteContext) {
  const policy = readServerAnalyticsPolicy();
  if (!policy) return analyticsUnavailableResponse(503);
  if (!validateAnalyticsRequest(request, policy)) return analyticsUnavailableResponse(403);

  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) return analyticsUnavailableResponse(400);
  if (!(await readAnalyticsJson(request))) return analyticsUnavailableResponse(400);

  const analytics = analyticsBackendOptions(request, policy, "granted");
  if (!analytics) return analyticsUnavailableResponse(400);

  try {
    const backend = await postBackend<Record<string, never>, ConsentResult>(
      `/applications/me/${applicationId}/analytics-consent`,
      {},
      { bearerToken: accessToken, ...analytics },
    );
    return createProjectedAnalyticsResponse(backend, (result) =>
      result?.registered === true ? { registered: true } : null,
    );
  } catch {
    return analyticsUnavailableResponse(502);
  }
}
