import { NextRequest } from "next/server";
import { badRequestResponse, proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyProfileResponse } from "@/types/review";

export const dynamic = "force-dynamic";

interface BuddyProfileRouteContext {
  params: Promise<{ buddyId: string }>;
}

export async function GET(request: NextRequest, context: BuddyProfileRouteContext) {
  const { buddyId } = await context.params;
  if (!/^\d+$/.test(buddyId)) {
    return badRequestResponse("잘못된 버디 ID입니다.");
  }

  return proxyPublicGet<BuddyProfileResponse>(
    request,
    `/buddies/${buddyId}`,
    "버디 정보 서버에 연결할 수 없습니다.",
  );
}
