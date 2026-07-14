import { NextRequest } from "next/server";
import { proxyAuthenticatedPost, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import type { ActivityPricePreviewRequest, ActivityPricePreviewResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<ActivityPricePreviewRequest>(
    request,
    "활동 가격 미리보기 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<ActivityPricePreviewRequest, ActivityPricePreviewResponse>(
    request,
    "/activities/price-preview",
    parsed.body,
    "활동 가격 미리보기 서버에 연결할 수 없습니다.",
  );
}
