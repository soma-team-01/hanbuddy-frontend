import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyScheduleDateResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 조회 기간(from·to)은 선택이다. 형식만 거르고 범위 검증은 백엔드 규칙(최대 42일)에 맡긴다 */
export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const key of ["from", "to"] as const) {
    const value = request.nextUrl.searchParams.get(key);
    if (value === null) continue;
    if (!DATE_KEY_PATTERN.test(value)) {
      return badRequestResponse("조회 기간 형식이 올바르지 않습니다.");
    }
    query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return proxyAuthenticatedGet<BuddyScheduleDateResponse[]>(
    request,
    `/applications/buddy/schedule-dates${suffix}`,
    "버디 활동 일정 날짜 서버에 연결할 수 없습니다.",
  );
}
