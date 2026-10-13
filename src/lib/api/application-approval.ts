import type { BuddyRejectionRequest } from "@/types/application";
import { fetchWithAuthRetry } from "./client";
import { createApiClientError, UnauthenticatedQueryError } from "./errors";

async function send(
  applicationId: number,
  action: "approve" | "reject",
  body?: BuddyRejectionRequest,
) {
  const response = await fetchWithAuthRetry(`/api/applications/${applicationId}/buddy/${action}`, {
    method: "POST",
    ...(body
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  if (response.status === 401) throw new UnauthenticatedQueryError();
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.isSuccess !== true)
    throw createApiClientError(response.status, payload);
  // Approval commands intentionally return no result DTO. Read fresh state after success.
}

export const approveApplication = (id: number) => send(id, "approve");
export function rejectApplication(id: number, request: BuddyRejectionRequest) {
  const detail = request.detail?.trim() ?? "";
  if (request.reason === "BUDDY_OTHER" && (!detail || detail.length > 255)) {
    return Promise.reject(
      createApiClientError(400, {
        isSuccess: false,
        code: "APPLICATION400_REJECTION",
        message: "Invalid rejection detail",
      }),
    );
  }
  return send(
    id,
    "reject",
    request.reason === "BUDDY_OTHER"
      ? { reason: request.reason, detail }
      : { reason: request.reason },
  );
}
