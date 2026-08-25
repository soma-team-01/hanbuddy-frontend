import { NextRequest } from "next/server";
import { proxyAuthenticatedPost, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { CreateApplicationRequest, PaymentReadyResponse } from "@/types/application";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<CreateApplicationRequest>(
    request,
    "신청 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<CreateApplicationRequest, PaymentReadyResponse>(
    request,
    appendRequestedContentLanguage(request, "/applications"),
    parsed.body,
    "신청 서버에 연결할 수 없습니다.",
  );
}
