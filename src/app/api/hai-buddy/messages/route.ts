import type { NextRequest } from "next/server";
import { proxyAuthenticatedPost, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import { HAI_BUDDY_TIMEOUT_MS } from "@/lib/api/hai-buddy-config";
import type { HaiBuddyMessageRequest, HaiBuddyReply } from "@/types/hai-buddy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<HaiBuddyMessageRequest>(request, "질문 형식이 올바르지 않습니다.");
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<HaiBuddyMessageRequest, HaiBuddyReply>(
    request,
    "/hai-buddy/messages",
    parsed.body,
    "HAI Buddy 서버에 연결할 수 없습니다.",
    { timeoutMs: HAI_BUDDY_TIMEOUT_MS },
  );
}
