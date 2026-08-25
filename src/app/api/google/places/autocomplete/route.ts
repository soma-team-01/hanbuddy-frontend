import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsApiKey, searchGooglePlacePredictions } from "@/lib/google/places";
import { isLocale, routing } from "@/i18n/routing";
import { getGooglePlacesReferrer } from "../referrer";

export const dynamic = "force-dynamic";

interface AutocompleteBody {
  input?: unknown;
  locale?: unknown;
}

export async function POST(request: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid address search request." }, { status: 400 });
  }
  // null 등 JSON 원시값 본문은 파싱에 성공하므로 별도로 400 처리한다
  if (typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ message: "Invalid address search request." }, { status: 400 });
  }
  const body = parsed as AutocompleteBody;

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const locale =
    typeof body.locale === "string" && isLocale(body.locale) ? body.locale : routing.defaultLocale;
  const apiKey = getGoogleMapsApiKey();
  if (!input) return NextResponse.json([]);
  if (!apiKey) {
    return NextResponse.json({ message: "Google Maps API key is missing." }, { status: 503 });
  }

  try {
    const predictions = await searchGooglePlacePredictions(input, apiKey, {
      locale,
      referrer: getGooglePlacesReferrer(request),
    });
    return NextResponse.json(predictions);
  } catch {
    return NextResponse.json({ message: "Address search is unavailable." }, { status: 502 });
  }
}
