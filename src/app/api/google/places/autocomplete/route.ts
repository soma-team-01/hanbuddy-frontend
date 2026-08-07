import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsApiKey, searchGooglePlacePredictions } from "@/lib/google/places";
import type { Locale } from "@/i18n/routing";
import { getGooglePlacesReferrer } from "../referrer";

export const dynamic = "force-dynamic";

interface AutocompleteBody {
  input?: unknown;
  locale?: unknown;
}

export async function POST(request: NextRequest) {
  let body: AutocompleteBody;
  try {
    body = (await request.json()) as AutocompleteBody;
  } catch {
    return NextResponse.json({ message: "Invalid address search request." }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const locale: Locale = body.locale === "ko" ? "ko" : "en";
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
