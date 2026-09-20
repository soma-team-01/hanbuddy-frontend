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
import { validIdentifiers, type AnalyticsIdentifiers } from "@/lib/analytics/link";

export const dynamic = "force-dynamic";

interface LinkRouteContext {
  params: Promise<{ applicationId: string }>;
}

interface LinkResult {
  linked: boolean;
}

export async function PUT(request: NextRequest, context: LinkRouteContext) {
  const policy = readServerAnalyticsPolicy();
  if (!policy?.measurementId) return analyticsUnavailableResponse(503);
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
  const fbp = body?.fbp;
  const fbc = body?.fbc;
  const eventSourceUrl = body?.eventSourceUrl;
  if (
    typeof clientId !== "string" ||
    (sessionId !== undefined && typeof sessionId !== "string") ||
    (fbp !== undefined && typeof fbp !== "string") ||
    (fbc !== undefined && typeof fbc !== "string") ||
    (eventSourceUrl !== undefined && typeof eventSourceUrl !== "string")
  )
    return analyticsUnavailableResponse(400);

  const identifiers: AnalyticsIdentifiers = {
    clientId,
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(fbp === undefined ? {} : { fbp }),
    ...(fbc === undefined ? {} : { fbc }),
    ...(eventSourceUrl === undefined ? {} : { eventSourceUrl }),
  };
  if ((fbp !== undefined || fbc !== undefined || eventSourceUrl !== undefined) && !policy.pixelId)
    return analyticsUnavailableResponse(503);
  if (!validIdentifiers(identifiers, policy.origin)) return analyticsUnavailableResponse(400);

  const analytics = analyticsBackendOptions(request, policy, "granted");
  if (!analytics) return analyticsUnavailableResponse(400);

  const projectedBody = identifiers;
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
