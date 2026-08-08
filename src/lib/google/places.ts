import { getExternalLocales } from "@/i18n/external-locales";
import type { Locale } from "@/i18n/routing";

const GOOGLE_PLACES_API_BASE_URL = "https://places.googleapis.com/v1";
const GOOGLE_MAPS_EMBED_BASE_URL = "https://www.google.com/maps/embed/v1/place";

export interface GooglePlaceDetails {
  formattedAddress: string;
}

export interface GooglePlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  text: string;
}

type Fetcher = typeof fetch;

interface GooglePlacesOptions {
  locale: Locale;
  fetcher?: Fetcher;
  referrer?: string;
  sessionToken?: string;
}

interface GooglePlaceDetailsResponse {
  formattedAddress?: string;
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
}

export function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function normalizeGooglePlaceId(placeId: string) {
  return placeId.trim().replace(/^places\//, "");
}

export function buildGoogleMapsEmbedUrl(placeId: string, apiKey: string, locale: Locale): string {
  const normalizedPlaceId = normalizeGooglePlaceId(placeId);
  const trimmedApiKey = apiKey.trim();

  if (!normalizedPlaceId || !trimmedApiKey) {
    return "";
  }

  const { googleLanguage, googleRegion } = getExternalLocales(locale);
  const params = new URLSearchParams({
    key: trimmedApiKey,
    q: `place_id:${normalizedPlaceId}`,
    language: googleLanguage,
    region: googleRegion,
  });

  return `${GOOGLE_MAPS_EMBED_BASE_URL}?${params.toString()}`;
}

export async function fetchGooglePlaceDetails(
  placeId: string,
  apiKey: string,
  options: GooglePlacesOptions,
): Promise<GooglePlaceDetails> {
  const { locale, fetcher = fetch, referrer, sessionToken } = options;
  const normalizedPlaceId = normalizeGooglePlaceId(placeId);
  const trimmedApiKey = apiKey.trim();
  const trimmedSessionToken = sessionToken?.trim();

  if (!normalizedPlaceId || !trimmedApiKey) {
    throw new Error("Google place id and API key are required.");
  }

  const { googleLanguage, googleRegion } = getExternalLocales(locale);
  const params = new URLSearchParams({
    languageCode: googleLanguage,
    regionCode: googleRegion,
  });
  if (trimmedSessionToken) {
    params.set("sessionToken", trimmedSessionToken);
  }
  const placeDetailsUrl = `${GOOGLE_PLACES_API_BASE_URL}/places/${normalizedPlaceId}?${params.toString()}`;
  const response = await fetcher(placeDetailsUrl, {
    headers: {
      ...(referrer ? { Referer: referrer } : {}),
      "X-Goog-Api-Key": trimmedApiKey,
      "X-Goog-FieldMask": "formattedAddress",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load Google place details.");
  }

  const place = (await response.json()) as GooglePlaceDetailsResponse;
  return {
    formattedAddress: place.formattedAddress?.trim() ?? "",
  };
}

export async function searchGooglePlacePredictions(
  input: string,
  apiKey: string,
  options: GooglePlacesOptions,
): Promise<GooglePlacePrediction[]> {
  const { locale, fetcher = fetch, referrer, sessionToken } = options;
  const trimmedInput = input.trim();
  const trimmedApiKey = apiKey.trim();
  const trimmedSessionToken = sessionToken?.trim();

  if (!trimmedInput || !trimmedApiKey) {
    return [];
  }

  const { googleLanguage, googleRegion } = getExternalLocales(locale);
  const response = await fetcher(`${GOOGLE_PLACES_API_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(referrer ? { Referer: referrer } : {}),
      "X-Goog-Api-Key": trimmedApiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: trimmedInput,
      includedRegionCodes: ["kr"],
      languageCode: googleLanguage,
      regionCode: googleRegion,
      ...(trimmedSessionToken ? { sessionToken: trimmedSessionToken } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to search Google places.");
  }

  const payload = (await response.json()) as GoogleAutocompleteResponse;
  return (payload.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    const placeId = prediction?.placeId?.trim();

    if (!prediction || !placeId) {
      return [];
    }

    const mainText = prediction.structuredFormat?.mainText?.text?.trim() ?? "";
    const secondaryText = prediction.structuredFormat?.secondaryText?.text?.trim() ?? "";
    const text =
      prediction.text?.text?.trim() ?? [mainText, secondaryText].filter(Boolean).join(", ");

    return [
      {
        placeId,
        mainText: mainText || text,
        secondaryText,
        text,
      },
    ];
  });
}

export async function searchGooglePlacePredictionsViaBff(
  input: string,
  locale: Locale,
  fetcher: Fetcher = fetch,
): Promise<GooglePlacePrediction[]> {
  const response = await fetcher("/api/google/places/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, locale }),
  });

  if (!response.ok) {
    throw new Error("Failed to search Google places through the BFF.");
  }

  return (await response.json()) as GooglePlacePrediction[];
}

export async function fetchGooglePlaceDetailsViaBff(
  placeId: string,
  locale: Locale,
  fetcher: Fetcher = fetch,
): Promise<GooglePlaceDetails> {
  const params = new URLSearchParams({ locale });
  const response = await fetcher(
    `/api/google/places/${encodeURIComponent(normalizeGooglePlaceId(placeId))}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to load Google place details through the BFF.");
  }

  return (await response.json()) as GooglePlaceDetails;
}
