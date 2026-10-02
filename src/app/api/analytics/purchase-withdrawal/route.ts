import { NextRequest } from "next/server";
import {
  ANALYTICS_PROOF_HEADER,
  analyticsBackendOptions,
  analyticsUnavailableResponse,
  createProjectedAnalyticsResponse,
  readAnalyticsJson,
  readAnalyticsOrigin,
  ANALYTICS_COOKIE_NAME,
  isConsentProof,
  validateAnalyticsRequest,
} from "@/app/api/_utils/analytics-bff";
import { postBackend } from "@/lib/auth/backend";

export const dynamic = "force-dynamic";

interface WithdrawalResult {
  withdrawalAcknowledged: boolean;
}

export async function POST(request: NextRequest) {
  const origin = readAnalyticsOrigin();
  if (!origin) return analyticsUnavailableResponse(503);
  const policy = { origin };
  if (!validateAnalyticsRequest(request, policy)) return analyticsUnavailableResponse(403);

  const body = await readAnalyticsJson(request);
  if (!body || Object.keys(body).length !== 0) return analyticsUnavailableResponse(400);

  const explicitProof = request.headers.get(ANALYTICS_PROOF_HEADER);
  const raw = explicitProof ?? request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  if (isConsentProof(raw, "granted")) return analyticsUnavailableResponse(403);
  const analytics = analyticsBackendOptions(request, policy, "denied", explicitProof);
  if (!analytics) return analyticsUnavailableResponse(410);

  try {
    const backend = await postBackend<Record<string, never>, WithdrawalResult>(
      "/analytics/purchase-withdrawal",
      {},
      analytics,
    );
    return createProjectedAnalyticsResponse(backend, (result) =>
      result?.withdrawalAcknowledged === true ? { withdrawalAcknowledged: true } : null,
    );
  } catch {
    return analyticsUnavailableResponse(502);
  }
}
