import { NextRequest } from "next/server";
import {
  ANALYTICS_CONTEXT_HEADER,
  analyticsBackendOptions,
  analyticsUnavailableResponse,
  createProjectedAnalyticsResponse,
  isAnalyticsContextCurrent,
  readAnalyticsJson,
  readServerAnalyticsPolicy,
  validateAnalyticsRequest,
} from "@/app/api/_utils/analytics-bff";
import { getAccessToken, unauthorizedResponse } from "@/app/api/_utils/authenticated-backend";
import { putBackend } from "@/lib/auth/backend";

export const dynamic = "force-dynamic";

interface LinkRouteContext {
  params: Promise<{ applicationId: string }>;
}

interface LinkResult {
  linked: boolean;
}

export async function PUT(request: NextRequest, context: LinkRouteContext) {
  const policy = readServerAnalyticsPolicy();
  if (!policy) return analyticsUnavailableResponse(503);
  if (!validateAnalyticsRequest(request, policy)) return analyticsUnavailableResponse(403);

  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();
  if (!isAnalyticsContextCurrent(request.headers.get(ANALYTICS_CONTEXT_HEADER), accessToken)) {
    return analyticsUnavailableResponse(409);
  }

  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) return analyticsUnavailableResponse(400);

  const body = await readAnalyticsJson(request);
  const clientId = body?.clientId;
  const sessionId = body?.sessionId;
  if (
    typeof clientId !== "string" ||
    !/^\d{1,20}\.\d{1,20}$/.test(clientId) ||
    !(
      sessionId === undefined ||
      (typeof sessionId === "string" &&
        /^[1-9]\d{0,18}$/.test(sessionId) &&
        (sessionId.length < 19 || sessionId <= "9223372036854775807"))
    )
  )
    return analyticsUnavailableResponse(400);

  const analytics = analyticsBackendOptions(request, policy, "granted");
  if (!analytics) return analyticsUnavailableResponse(400);

  const projectedBody = {
    clientId,
    ...(sessionId === undefined ? {} : { sessionId }),
  };
  try {
    const backend = await putBackend<typeof projectedBody, LinkResult>(
      `/applications/me/${applicationId}/analytics-link`,
      projectedBody,
      { bearerToken: accessToken, ...analytics },
    );
    return createProjectedAnalyticsResponse(backend, (result) =>
      result?.linked === true ? { linked: true } : null,
    );
  } catch {
    return analyticsUnavailableResponse(502);
  }
}
