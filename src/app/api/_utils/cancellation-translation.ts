import { NextRequest, NextResponse } from "next/server";
import { getBackend } from "@/lib/auth/backend";
import { isContentLanguage } from "@/types/content-language";
import type {
  CancellationTranslation,
  CancellationTranslationTarget,
} from "@/types/cancellation-translation";
import {
  getAccessToken,
  unauthorizedResponse,
  createBackendJsonResponse,
  backendUnavailableResponse,
} from "./authenticated-backend";

/** Never log upstream translation responses/errors: they may contain private free text. */
export async function proxyCancellationTranslation(
  request: NextRequest,
  kind: CancellationTranslationTarget,
  id: string,
) {
  const noStore = (response: Response) => {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const token = getAccessToken(request);
  if (!token) return noStore(unauthorizedResponse());
  const language = request.nextUrl.searchParams.get("language");
  if (!/^[1-9]\d*$/.test(id) || !isContentLanguage(language)) {
    return noStore(
      NextResponse.json(
        {
          isSuccess: false,
          code: language === null ? "VALIDATION400_REQUIRED" : "VALIDATION400_FORMAT",
          message: "Invalid translation target",
        },
        { status: 400 },
      ),
    );
  }
  const resource = kind === "application" ? "applications" : "activity-schedules";
  try {
    return noStore(
      createBackendJsonResponse(
        await getBackend<CancellationTranslation>(
          `/${resource}/${id}/cancellation-translation?language=${language}`,
          { bearerToken: token },
        ),
      ),
    );
  } catch {
    return noStore(backendUnavailableResponse("취소 사유 번역을 불러오지 못했습니다."));
  }
}
