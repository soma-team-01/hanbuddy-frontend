import { APP_ORIGIN } from "@/lib/site";
import { parseProof } from "@/lib/analytics/cookie-consent";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  backendUnavailableResponse,
  createBackendJsonResponse,
  getAccessToken,
  unauthorizedResponse,
} from "@/app/api/_utils/authenticated-backend";
import { readAnalyticsPolicy, type AnalyticsPolicy } from "@/lib/analytics/policy";
import { postBackend, type BackendResponse } from "@/lib/auth/backend";

export const ANALYTICS_COOKIE_NAME = "__Host-hb_ga_consent";
export const ANALYTICS_CONTEXT_HEADER = "X-Analytics-Context";
export const ANALYTICS_PROOF_HEADER = "X-Analytics-Proof";
export const ANALYTICS_REQUEST_HEADER = "X-Analytics-Request";

type ConsentChoice = "granted" | "denied";
export function readServerAnalyticsPolicy() {
  return readAnalyticsPolicy({
    GA_ENABLED: process.env.GA_ENABLED,
    GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID,
  });
}

interface AnalyticsBackendOptions {
  cookieHeader: string;
  origin: string;
  analyticsRequest: true;
}

export function analyticsContextForToken(accessToken: string) {
  return createHash("sha256").update(accessToken, "utf8").digest("hex");
}

export function isAnalyticsContextCurrent(candidate: string | null, accessToken: string) {
  if (!candidate || !/^[a-f0-9]{64}$/.test(candidate)) return false;
  const expected = Buffer.from(analyticsContextForToken(accessToken), "hex");
  const actual = Buffer.from(candidate, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isConsentProof(value: string | undefined, choice: ConsentChoice) {
  const proof = parseProof(value ?? "");
  return Boolean(proof && proof.granted === (choice === "granted"));
}

/** Withdrawal remains available while collection is OFF; only the configured origin is needed. */
export function readAnalyticsOrigin() {
  return APP_ORIGIN;
}

export function analyticsUnavailableResponse(status: 400 | 403 | 409 | 410 | 415 | 502 | 503) {
  const codes = {
    400: "ANALYTICS_INVALID",
    403: "ANALYTICS_FORBIDDEN",
    409: "ANALYTICS_CONTEXT_CHANGED",
    410: "ANALYTICS_REVOKED_OR_EXPIRED",
    415: "ANALYTICS_INVALID",
    502: "ANALYTICS_PROXY_ERROR",
    503: "ANALYTICS_DISABLED",
  };
  const code = codes[status];
  return NextResponse.json(
    { isSuccess: false, code, message: "Analytics request unavailable" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function validateAnalyticsRequest(
  request: NextRequest,
  policy: Pick<AnalyticsPolicy, "origin">,
) {
  return (
    request.headers.get("origin") === policy.origin &&
    request.headers.get(ANALYTICS_REQUEST_HEADER) === "1"
  );
}

export function isJsonRequest(request: NextRequest) {
  return request.headers.get("content-type")?.split(";", 1)[0].trim() === "application/json";
}

export async function readAnalyticsJson(request: NextRequest) {
  if (!isJsonRequest(request)) return null;
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function analyticsBackendOptions(
  request: NextRequest,
  policy: Pick<AnalyticsPolicy, "origin">,
  choice: ConsentChoice,
  explicitProof?: string | null,
): AnalyticsBackendOptions | null {
  if (!validateAnalyticsRequest(request, policy)) return null;
  const proof = explicitProof ?? request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  if (!isConsentProof(proof, choice)) return null;
  return {
    cookieHeader: `${ANALYTICS_COOKIE_NAME}=${proof}`,
    origin: policy.origin,
    analyticsRequest: true,
  };
}

export async function proxyApplicationPost<TBody, TResult>(
  request: NextRequest,
  backendPath: string,
  body: TBody,
  unavailableMessage: string,
) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  const policy = readServerAnalyticsPolicy();
  const analytics = policy ? analyticsBackendOptions(request, policy, "granted") : null;

  try {
    const backend = await postBackend<TBody, TResult>(backendPath, body, {
      bearerToken: accessToken,
      ...analytics,
    });
    const response = createBackendJsonResponse(backend);
    if (analytics && backend.status >= 200 && backend.status < 300 && backend.payload.isSuccess) {
      response.headers.set(ANALYTICS_CONTEXT_HEADER, analyticsContextForToken(accessToken));
    }
    return response;
  } catch {
    return backendUnavailableResponse(unavailableMessage);
  }
}

export function createProjectedAnalyticsResponse<TResult, TProjected>(
  backend: BackendResponse<TResult>,
  project: (result: TResult) => TProjected | null,
) {
  if (backend.status >= 200 && backend.status < 300 && backend.payload.isSuccess) {
    const result = project(backend.payload.result);
    if (result !== null) {
      return NextResponse.json(
        {
          isSuccess: true,
          code: backend.payload.code,
          message: backend.payload.message,
          result,
        },
        { status: backend.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return analyticsUnavailableResponse(502);
  }

  const code =
    !backend.payload.isSuccess && /^ANALYTICS_[A-Z_]+$/.test(backend.payload.code)
      ? backend.payload.code
      : "ANALYTICS_PROXY_ERROR";
  const status = backend.status >= 400 && backend.status <= 599 ? backend.status : 502;
  return NextResponse.json(
    { isSuccess: false, code, message: "Analytics request unavailable" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
