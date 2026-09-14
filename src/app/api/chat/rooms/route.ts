import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ChatRoomSummaryResponse } from "@/types/chat";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<ChatRoomSummaryResponse[]>(
    request,
    appendRequestedContentLanguage(request, "/chat/rooms"),
    "채팅 서버에 연결할 수 없습니다.",
  );
}
