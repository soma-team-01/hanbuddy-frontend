import { NextRequest } from "next/server";
import { proxyAuthenticatedPost, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import type {
  ActivityPricingPreviewRequest,
  ActivityPricingPreview,
} from "@/types/activity-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<ActivityPricingPreviewRequest>(
    request,
    "가격표 미리보기 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;
  const response = await proxyAuthenticatedPost<
    ActivityPricingPreviewRequest,
    ActivityPricingPreview
  >(
    request,
    "/activities/pricing-preview",
    parsed.body,
    "가격표 미리보기 서버에 연결할 수 없습니다.",
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
