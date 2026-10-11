import { NextRequest, NextResponse } from "next/server";
import { proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import type { ActivityPriceQuote } from "@/types/activity-pricing";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ activityId: string }> },
) {
  const { activityId } = await context.params;
  const guests = request.nextUrl.searchParams.get("guestCount") ?? "";
  if (
    !/^[1-9]\d*$/.test(activityId) ||
    !Number.isSafeInteger(Number(activityId)) ||
    !/^\d+$/.test(guests) ||
    Number(guests) < 1 ||
    Number(guests) > 100
  ) {
    return NextResponse.json(
      { isSuccess: false, code: "VALIDATION400_RANGE", message: "Invalid activity or guest count" },
      { status: 400 },
    );
  }
  const response = await proxyPublicGet<ActivityPriceQuote>(
    request,
    `/activities/${activityId}/price-quote?guestCount=${Number(guests)}`,
    "신청 가격을 불러오지 못했습니다.",
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
