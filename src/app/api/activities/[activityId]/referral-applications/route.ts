import type { NextRequest } from "next/server";
import { badRequestResponse, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import { referralProxy } from "@/app/api/_utils/referral-backend";
import { positiveReferralId } from "@/lib/referral";
import type { ReferralApplicationRequest } from "@/types/referral";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> },
) {
  try {
    const id = positiveReferralId((await params).activityId);
    const parsed = await readJsonBody<ReferralApplicationRequest>(
      request,
      "신청 내용을 확인해 주세요.",
    );
    if (!parsed.ok) return parsed.response;
    const {
      activityScheduleId,
      guestCount,
      partnerSharingAgreed,
      consentVersion,
      specialRequest,
      reapplyFromApplicationId,
    } = parsed.body;
    positiveReferralId(String(activityScheduleId));
    if (
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > 100 ||
      partnerSharingAgreed !== true ||
      typeof consentVersion !== "string" ||
      !consentVersion.trim() ||
      consentVersion.length > 30 ||
      (reapplyFromApplicationId !== undefined &&
        (!Number.isSafeInteger(reapplyFromApplicationId) || reapplyFromApplicationId <= 0)) ||
      (specialRequest != null &&
        (typeof specialRequest !== "string" || specialRequest.length > 1000))
    )
      return badRequestResponse("인원 및 개인정보 제공 동의를 확인해 주세요.");
    return referralProxy(request, `/activities/${id}/referral-applications`, {
      activityScheduleId,
      guestCount,
      partnerSharingAgreed,
      consentVersion,
      ...(reapplyFromApplicationId === undefined ? {} : { reapplyFromApplicationId }),
      ...(specialRequest == null ? {} : { specialRequest: specialRequest.trim() || null }),
    });
  } catch {
    return badRequestResponse("신청 내용을 확인해 주세요.");
  }
}
