import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyScheduleDateResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<BuddyScheduleDateResponse[]>(
    request,
    "/applications/buddy/schedule-dates",
    "버디 활동 일정 날짜 서버에 연결할 수 없습니다.",
  );
}
