import type { NextRequest } from "next/server";

export function getGooglePlacesReferrer(request: NextRequest) {
  const { hostname, origin } = request.nextUrl;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3000/";
  }

  return `${origin}/`;
}
