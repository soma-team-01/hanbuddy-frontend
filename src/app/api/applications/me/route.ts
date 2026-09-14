import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ApplicationResponse } from "@/types/application";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<ApplicationResponse[]>(
    request,
    appendRequestedContentLanguage(request, "/applications/me"),
    "신청 목록 서버에 연결할 수 없습니다.",
  );
}
