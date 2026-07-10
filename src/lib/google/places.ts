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

export function buildGoogleMapsEmbedUrl(placeId: string, apiKey: string) {
  const normalizedPlaceId = normalizeGooglePlaceId(placeId);
  const trimmedApiKey = apiKey.trim();

  if (!normalizedPlaceId || !trimmedApiKey) {
    return "";
  }

  const params = new URLSearchParams({
    key: trimmedApiKey,
    q: `place_id:${normalizedPlaceId}`,
  });

  return `${GOOGLE_MAPS_EMBED_BASE_URL}?${params.toString()}`;
}

export async function fetchGooglePlaceDetails(
  placeId: string,
  apiKey: string,
  fetcher: Fetcher = fetch,
): Promise<GooglePlaceDetails> {
  const normalizedPlaceId = normalizeGooglePlaceId(placeId);
  const trimmedApiKey = apiKey.trim();

  if (!normalizedPlaceId || !trimmedApiKey) {
    throw new Error("Google place id and API key are required.");
  }

  const response = await fetcher(`${GOOGLE_PLACES_API_BASE_URL}/places/${normalizedPlaceId}`, {
    headers: {
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
  fetcher: Fetcher = fetch,
): Promise<GooglePlacePrediction[]> {
  const trimmedInput = input.trim();
  const trimmedApiKey = apiKey.trim();

  if (trimmedInput.length < 3 || !trimmedApiKey) {
    return [];
  }

  const response = await fetcher(`${GOOGLE_PLACES_API_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": trimmedApiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: trimmedInput,
      includedRegionCodes: ["kr"],
      languageCode: "en",
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
