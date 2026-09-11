import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedActivityDisplayOptions } from "@/app/api/_utils/content-language";
import type { AppliedActivityDetailResponse } from "@/types/application";

export const dynamic = "force-dynamic";

interface AppliedActivityRouteContext {
  params: Promise<{ applicationId: string }>;
}

function noStore(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, context: AppliedActivityRouteContext) {
  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return noStore(badRequestResponse("잘못된 신청 ID입니다."));
  }

  const backendPath = appendRequestedActivityDisplayOptions(
    request,
    `/applications/${applicationId}/activity`,
  );
  return noStore(
    await proxyAuthenticatedGet<AppliedActivityDetailResponse>(
      request,
      backendPath,
      "신청한 활동 상세 서버에 연결할 수 없습니다.",
    ),
  );
}
