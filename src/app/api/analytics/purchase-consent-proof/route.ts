import { NextRequest } from "next/server";
import {
  analyticsBackendOptions,
  ANALYTICS_COOKIE_NAME,
  analyticsUnavailableResponse,
  createProjectedAnalyticsResponse,
  isConsentProof,
  readAnalyticsJson,
  readServerAnalyticsPolicy,
  validateAnalyticsRequest,
} from "@/app/api/_utils/analytics-bff";
import { postBackend } from "@/lib/auth/backend";

export const dynamic = "force-dynamic";

interface ProofResult {
  proof: string;
  expiresAt: string;
}

export async function POST(request: NextRequest) {
  const policy = readServerAnalyticsPolicy();
  if (!policy) return analyticsUnavailableResponse(503);
  if (!validateAnalyticsRequest(request, policy)) return analyticsUnavailableResponse(403);

  const body = await readAnalyticsJson(request);
  const action = body?.action;
  if (action !== "ACCEPT" && action !== "RESTORE") return analyticsUnavailableResponse(400);

  const raw = request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  const choice = isConsentProof(raw, "denied") ? "denied" : "granted";
  const existing = analyticsBackendOptions(request, policy, choice);
  if (raw && !existing) return analyticsUnavailableResponse(410);
  if (action === "RESTORE" && (!existing || choice === "denied"))
    return analyticsUnavailableResponse(410);

  try {
    const backend = await postBackend<{ action: "ACCEPT" | "RESTORE" }, ProofResult>(
      "/analytics/purchase-consent-proof",
      { action },
      existing ?? { origin: policy.origin, analyticsRequest: true },
    );
    return createProjectedAnalyticsResponse(backend, (result) => {
      if (
        !result ||
        !isConsentProof(result.proof, "granted") ||
        typeof result.expiresAt !== "string" ||
        Number.isNaN(Date.parse(result.expiresAt))
      )
        return null;
      return { proof: result.proof, expiresAt: result.expiresAt };
    });
  } catch {
    return analyticsUnavailableResponse(502);
  }
}
