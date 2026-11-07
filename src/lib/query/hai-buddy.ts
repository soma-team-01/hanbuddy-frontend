import { queryOptions } from "@tanstack/react-query";
import { getLatestHaiBuddyConversation } from "@/lib/api/hai-buddy";
import type { ContentLanguage } from "@/types/content-language";
import { unwrapApiResult } from "./result";

export const haiBuddyKeys = {
  latest: (language: ContentLanguage) => ["hai-buddy", "latest", language] as const,
};

/**
 * 패널을 다시 열 때 최근 대화를 복원한다. 404(서버에서 꺼짐)도 이 조회로 알아내 런처를 숨기므로 재시도하지 않는다.
 */
export function haiBuddyLatestQueryOptions(language: ContentLanguage) {
  return queryOptions({
    queryKey: haiBuddyKeys.latest(language),
    queryFn: async () => unwrapApiResult(await getLatestHaiBuddyConversation(language), "conversation"),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
