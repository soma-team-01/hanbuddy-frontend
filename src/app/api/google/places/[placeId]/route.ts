import { NextRequest, NextResponse } from "next/server";
import { fetchGooglePlaceDetails, getGoogleMapsApiKey } from "@/lib/google/places";
import type { Locale } from "@/i18n/routing";
import { getGooglePlacesReferrer } from "../referrer";

export const dynamic = "force-dynamic";

interface PlaceDetailsRouteContext {
  params: Promise<{ placeId: string }>;
}

export async function GET(request: NextRequest, context: PlaceDetailsRouteContext) {
  const { placeId } = await context.params;
  const locale: Locale = request.nextUrl.searchParams.get("locale") === "ko" ? "ko" : "en";
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json({ message: "Google Maps API key is missing." }, { status: 503 });
  }

  try {
    const details = await fetchGooglePlaceDetails(placeId, apiKey, {
      locale,
      referrer: getGooglePlacesReferrer(request),
    });
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ message: "Address details are unavailable." }, { status: 502 });
  }
}
