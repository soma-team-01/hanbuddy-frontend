import type { NextRequest } from "next/server";
import { withContentLanguage } from "@/lib/content-language";
import { isContentLanguage } from "@/types/content-language";

/** BFF 요청의 유효한 language만 백엔드에 전달한다. 미지정·잘못된 값은 원문 조회로 처리한다. */
export function appendRequestedContentLanguage(request: NextRequest, backendPath: string): string {
  const language = request.nextUrl.searchParams.get("language");
  return isContentLanguage(language) ? withContentLanguage(backendPath, language) : backendPath;
}
