import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedPost } from "@/app/api/_utils/authenticated-backend";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  if (!/^[1-9]\d*$/.test(applicationId)) return badRequestResponse("잘못된 신청 ID입니다.");
  return proxyAuthenticatedPost<undefined, void>(
    request,
    `/applications/${applicationId}/buddy/approve`,
    undefined,
    "신청 승인 서버에 연결할 수 없습니다.",
  );
}
