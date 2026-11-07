import { withContentLanguage } from "@/lib/content-language";
import type { ContentLanguage } from "@/types/content-language";
import type {
  HaiBuddyConversation,
  HaiBuddyFeedbackRating,
  HaiBuddyMessageRequest,
  HaiBuddyReply,
} from "@/types/hai-buddy";
import { requestApiResult, type ApiResult } from "./result";

export type HaiBuddyReplyResult = ApiResult<HaiBuddyReply, "reply">;
export type HaiBuddyConversationResult = ApiResult<HaiBuddyConversation, "conversation">;
export type HaiBuddyFeedbackResult = ApiResult<null, "feedback">;

function jsonRequest(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function sendHaiBuddyMessage(input: HaiBuddyMessageRequest): Promise<HaiBuddyReplyResult> {
  return requestApiResult<HaiBuddyReply, "reply">(
    "/api/hai-buddy/messages",
    "reply",
    jsonRequest(input),
    "HAI Buddy가 답하지 못했습니다.",
  );
}

export function getLatestHaiBuddyConversation(
  language: ContentLanguage,
): Promise<HaiBuddyConversationResult> {
  return requestApiResult<HaiBuddyConversation, "conversation">(
    withContentLanguage("/api/hai-buddy/conversations/latest", language),
    "conversation",
    undefined,
    "HAI Buddy 대화를 불러오지 못했습니다.",
  );
}

export function sendHaiBuddyFeedback(
  messageId: number,
  rating: HaiBuddyFeedbackRating,
): Promise<HaiBuddyFeedbackResult> {
  return requestApiResult<null, "feedback">(
    `/api/hai-buddy/messages/${messageId}/feedback`,
    "feedback",
    jsonRequest({ rating }),
    "피드백을 보내지 못했습니다.",
  );
}
