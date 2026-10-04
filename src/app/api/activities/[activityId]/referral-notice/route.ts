import type { NextRequest } from "next/server";
import { badRequestResponse } from "@/app/api/_utils/authenticated-backend";
import { referralProxy } from "@/app/api/_utils/referral-backend";
import { positiveReferralId } from "@/lib/referral";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> },
) {
  try {
    const id = positiveReferralId((await params).activityId);
    return referralProxy(request, `/activities/${id}/referral-notice`, undefined, true);
  } catch {
    return badRequestResponse("잘못된 활동 ID입니다.");
  }
}
