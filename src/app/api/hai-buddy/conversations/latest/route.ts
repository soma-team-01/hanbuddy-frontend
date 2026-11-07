import type { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { HaiBuddyConversation } from "@/types/hai-buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<HaiBuddyConversation>(
    request,
    appendRequestedContentLanguage(request, "/hai-buddy/conversations/latest"),
    "HAI Buddy 대화를 불러올 수 없습니다.",
  );
}
