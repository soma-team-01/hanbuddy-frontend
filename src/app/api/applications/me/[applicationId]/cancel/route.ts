import { NextRequest } from "next/server";
import { proxyAuthenticatedPatch, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import type { ApplicationResponse, CancelApplicationRequest } from "@/types/application";

export const dynamic = "force-dynamic";

interface CancelApplicationRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function PATCH(request: NextRequest, context: CancelApplicationRouteContext) {
  const parsed = await readJsonBody<CancelApplicationRequest>(
    request,
    "신청 취소 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  const { applicationId } = await context.params;
  return proxyAuthenticatedPatch<CancelApplicationRequest, ApplicationResponse>(
    request,
    `/applications/me/${applicationId}/cancel`,
    parsed.body,
    "신청 취소 서버에 연결할 수 없습니다.",
  );
}
