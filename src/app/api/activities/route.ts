import { NextRequest } from "next/server";
import {
  proxyAuthenticatedPost,
  proxyPublicGet,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { TouristActivitySummary } from "@/types/activity";
import type { ActivityUpsertRequest, MyActivityDetailResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyPublicGet<TouristActivitySummary[]>(
    request,
    appendRequestedContentLanguage(request, "/activities"),
    "활동 목록 서버에 연결할 수 없습니다.",
  );
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<ActivityUpsertRequest>(
    request,
    "활동 생성 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<ActivityUpsertRequest, MyActivityDetailResponse>(
    request,
    "/activities",
    parsed.body,
    "활동 생성 서버에 연결할 수 없습니다.",
  );
}
