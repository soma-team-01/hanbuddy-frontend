import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { HaiBuddyFeedbackRating } from "@/types/hai-buddy";

export const dynamic = "force-dynamic";

const RATINGS: readonly HaiBuddyFeedbackRating[] = ["UP", "DOWN"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await context.params;
  if (!/^\d+$/.test(messageId)) return badRequestResponse("답변 ID가 올바르지 않습니다.");
  const parsed = await readJsonBody<{ rating?: unknown }>(request, "피드백 형식이 올바르지 않습니다.");
  if (!parsed.ok) return parsed.response;
  const rating = parsed.body.rating as HaiBuddyFeedbackRating;
  if (!RATINGS.includes(rating)) return badRequestResponse("피드백 값이 올바르지 않습니다.");

  return proxyAuthenticatedPost<{ rating: HaiBuddyFeedbackRating }, null>(
    request,
    `/hai-buddy/messages/${messageId}/feedback`,
    { rating },
    "HAI Buddy 서버에 연결할 수 없습니다.",
  );
}
