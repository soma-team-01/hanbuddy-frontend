import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import { isPositiveId } from "@/app/api/_utils/chat-input";
import type { ChatRoomDetailResponse, CreateGroupChatRoomRequest } from "@/types/chat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<CreateGroupChatRoomRequest>(request, "잘못된 요청 형식입니다.");
  if (!parsed.ok) return parsed.response;

  if (!isPositiveId(parsed.body?.activityScheduleId)) {
    return badRequestResponse("활동 회차가 올바르지 않습니다.");
  }

  return proxyAuthenticatedPost<CreateGroupChatRoomRequest, ChatRoomDetailResponse>(
    request,
    appendRequestedContentLanguage(request, "/chat/rooms/group"),
    { activityScheduleId: parsed.body.activityScheduleId },
    "채팅 서버에 연결할 수 없습니다.",
  );
}
