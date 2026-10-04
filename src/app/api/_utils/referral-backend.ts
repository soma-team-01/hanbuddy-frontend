import type { NextRequest } from "next/server";
import { getBackend, postBackend, patchBackend } from "@/lib/auth/backend";
import {
  backendUnavailableResponse,
  badRequestResponse,
  createBackendJsonResponse,
  getAccessToken,
  readJsonBody,
  requireAdmin,
  unauthorizedResponse,
} from "./authenticated-backend";
import { positiveReferralId, referralActivityPayload, referralQuery } from "@/lib/referral";

const DAY_MS = 86_400_000;
const MAX_INVITATION_DAYS = 30;
const INVITATION_CLOCK_MARGIN_MS = 10 * 60_000;

function resolveInvitationExpiry(body: Record<string, unknown>, now = Date.now()): string | null {
  if ("validityDays" in body) {
    const days = body.validityDays;
    if (
      "expiresAt" in body ||
      typeof days !== "number" ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > MAX_INVITATION_DAYS
    )
      return null;
    // Leave room for small BFF/backend clock differences at the backend's 30-day cap.
    const margin = days === MAX_INVITATION_DAYS ? INVITATION_CLOCK_MARGIN_MS : 0;
    return new Date(now + days * DAY_MS - margin).toISOString();
  }

  // Keep accepting absolute timestamps from already-deployed frontend bundles.
  if (typeof body.expiresAt !== "string") return null;
  const expires = Date.parse(body.expiresAt);
  return Number.isFinite(expires) && expires > now && expires <= now + MAX_INVITATION_DAYS * DAY_MS
    ? body.expiresAt
    : null;
}

/** Invitation bodies/PII must never be included in caught error logs. */
export async function referralProxy(
  request: NextRequest,
  path: string,
  body?: object,
  isPublic = false,
) {
  const token = getAccessToken(request);
  if (!isPublic && !token) return unauthorizedResponse();
  try {
    const options = isPublic ? {} : { bearerToken: token };
    const backend =
      request.method === "GET"
        ? await getBackend(path, options)
        : request.method === "PATCH"
          ? await patchBackend(path, body, options)
          : await postBackend(path, body, options);
    const response = createBackendJsonResponse(backend);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return backendUnavailableResponse("제휴 요청을 처리하지 못했습니다.");
  }
}

export async function handleReferralRoute(request: NextRequest, segments: string[], admin = false) {
  if (admin) {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;
  } else if (!getAccessToken(request)) return unauthorizedResponse();
  const [resource, id, action] = segments;
  try {
    if (request.method === "GET") {
      if (
        segments.length === 1 &&
        ["applications", ...(admin ? ["invitations", "activities"] : [])].includes(resource)
      ) {
        const query = referralQuery(
          request.nextUrl.searchParams,
          admin,
          resource === "applications",
        );
        return referralProxy(
          request,
          `${admin ? "/admin/referral-" : "/referral/"}${resource}?${query}`,
        );
      }
      if (admin && resource === "activities" && segments.length === 2)
        return referralProxy(request, `/admin/referral-activities/${positiveReferralId(id)}`);
    }
    if (request.method === "POST") {
      if (admin && resource === "invitations" && segments.length === 3 && action === "revoke")
        return referralProxy(
          request,
          `/admin/referral-invitations/${positiveReferralId(id)}/revoke`,
        );
      if (!admin && resource === "applications" && segments.length === 3 && action === "cancel")
        return referralProxy(request, `/referral/applications/${positiveReferralId(id)}/cancel`);
      const parsed = await readJsonBody<Record<string, unknown>>(
        request,
        "입력 내용을 확인해 주세요.",
      );
      if (!parsed.ok) return parsed.response;
      const body = parsed.body;
      if (admin && resource === "invitations" && segments.length === 1) {
        positiveReferralId(String(body.buddyId));
        const expiresAt = resolveInvitationExpiry(body);
        if (!expiresAt) return badRequestResponse("만료일은 현재 이후 30일 이내로 선택해 주세요.");
        return referralProxy(request, "/admin/referral-invitations", {
          buddyId: body.buddyId,
          expiresAt,
        });
      }
      if (
        !admin &&
        ((resource === "invitations" && id === "validate" && segments.length === 2) ||
          (resource === "activities" && segments.length === 1))
      ) {
        if (typeof body.code !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.code))
          return badRequestResponse("등록 링크를 확인해 주세요.");
        if (resource === "invitations")
          return referralProxy(request, "/referral/invitations/validate", { code: body.code });
        if (!body.activity || typeof body.activity !== "object" || Array.isArray(body.activity))
          return badRequestResponse("활동 내용을 확인해 주세요.");
        return referralProxy(request, "/referral/activities", {
          code: body.code,
          activity: { ...referralActivityPayload(body.activity), status: "ACTIVE" },
        });
      }
    }
    if (
      !admin &&
      request.method === "PATCH" &&
      resource === "activities" &&
      segments.length === 2
    ) {
      positiveReferralId(id);
      const parsed = await readJsonBody<Record<string, unknown>>(
        request,
        "활동 내용을 확인해 주세요.",
      );
      if (!parsed.ok) return parsed.response;
      return referralProxy(
        request,
        `/referral/activities/${id}`,
        referralActivityPayload(parsed.body),
      );
    }
  } catch {
    return badRequestResponse("요청 조건을 확인해 주세요.");
  }
  return badRequestResponse("지원하지 않는 제휴 요청입니다.");
}
