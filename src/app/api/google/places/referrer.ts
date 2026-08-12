import type { NextRequest } from "next/server";

export function getGooglePlacesReferrer(request: NextRequest) {
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    try {
      return `${new URL(configuredRedirectUri).origin}/`;
    } catch {
      // 잘못된 로컬 설정에서는 요청 origin을 사용한다.
    }
  }

  const { hostname, origin } = request.nextUrl;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3000/";
  }

  return `${origin}/`;
}
