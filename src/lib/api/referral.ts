import type { AdminPageResponse } from "@/types/admin";
import type { MyActivityDetailResponse } from "@/types/buddy";
import type { ApplicationResponse } from "@/types/application";
import type {
  ReferralActivityRequest,
  ReferralActivitySummary,
  ReferralApplicant,
  ReferralApplicationRequest,
  ReferralInvitation,
  ReferralNotice,
} from "@/types/referral";
import { requestApiResult } from "./result";
import { referralActivityPayload } from "@/lib/referral";

function read<T>(path: string) {
  return requestApiResult<T, "data">(
    path,
    "data",
    { cache: "no-store" },
    "Unable to load referral information.",
  );
}
function send<T>(path: string, body?: object, method = "POST") {
  return requestApiResult<T, "data">(
    path,
    "data",
    {
      method,
      ...(body
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    },
    "Unable to process this request. Please try again.",
  );
}
export const getReferralNotice = (id: string) =>
  read<ReferralNotice>(`/api/activities/${id}/referral-notice`);
export const submitReferralApplication = (id: string, body: ReferralApplicationRequest) =>
  send<ApplicationResponse>(`/api/activities/${id}/referral-applications`, body);
export const cancelReferralApplication = (id: string) =>
  send<ApplicationResponse>(`/api/referral/applications/${id}/cancel`);
export const validateReferralInvitation = (code: string) =>
  send<ReferralInvitation>("/api/referral/invitations/validate", { code });
export const createReferralActivity = (code: string, activity: ReferralActivityRequest) =>
  send<MyActivityDetailResponse>("/api/referral/activities", {
    code,
    activity: referralActivityPayload(activity),
  });
export const updateReferralActivity = (id: string, activity: ReferralActivityRequest) =>
  send<MyActivityDetailResponse>(
    `/api/referral/activities/${id}`,
    referralActivityPayload(activity),
    "PATCH",
  );
export const issueReferralInvitation = (buddyId: number, expiresAt: string) =>
  send<ReferralInvitation>("/api/admin/referral-invitations", { buddyId, expiresAt });
export const revokeReferralInvitation = (id: number) =>
  send<ReferralInvitation>(`/api/admin/referral-invitations/${id}/revoke`);
export const getReferralInvitations = (page = 0) =>
  read<AdminPageResponse<ReferralInvitation>>(
    `/api/admin/referral-invitations?page=${page}&size=20`,
  );
export const getReferralActivities = (page = 0) =>
  read<AdminPageResponse<ReferralActivitySummary>>(
    `/api/admin/referral-activities?page=${page}&size=20`,
  );
export const getAdminReferralActivity = (id: number) =>
  read<MyActivityDetailResponse>(`/api/admin/referral-activities/${id}`);
export const getReferralApplicants = (admin: boolean, filters: URLSearchParams) =>
  read<AdminPageResponse<ReferralApplicant>>(
    `/api/${admin ? "admin/referral-applications" : "referral/applications"}?${filters}`,
  );
