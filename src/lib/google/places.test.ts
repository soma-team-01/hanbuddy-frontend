import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  fetchGooglePlaceDetailsViaBff,
  searchGooglePlacePredictions,
  searchGooglePlacePredictionsViaBff,
} from "./places";

describe("Google Places helpers", () => {
  it("builds a Korean-localized Embed API place URL from a place id", () => {
    expect(buildGoogleMapsEmbedUrl("places/ChIJ-bukchon", "test-key", "ko")).toBe(
      "https://www.google.com/maps/embed/v1/place?key=test-key&q=place_id%3AChIJ-bukchon&language=ko&region=KR",
    );
  });

  it("fetches the formatted address and coordinates in the requested language and Korean region", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          formattedAddress: "Jongno-gu, Seoul",
          location: { latitude: 37.579617, longitude: 126.977041 },
        }),
        { status: 200 },
      ),
    );

    await expect(
      fetchGooglePlaceDetails("ChIJ-bukchon", "test-key", {
        locale: "ko",
        fetcher,
        referrer: "http://localhost:3000/",
        sessionToken: "session-token",
      }),
    ).resolves.toEqual({
      formattedAddress: "Jongno-gu, Seoul",
      latitude: 37.579617,
      longitude: 126.977041,
    });

    const [requestUrl, requestInit] = fetcher.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.origin + url.pathname).toBe("https://places.googleapis.com/v1/places/ChIJ-bukchon");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      languageCode: "ko",
      regionCode: "KR",
      sessionToken: "session-token",
    });
    expect(requestInit).toEqual(
      expect.objectContaining({
        headers: {
          Referer: "http://localhost:3000/",
          "X-Goog-Api-Key": "test-key",
          "X-Goog-FieldMask": "formattedAddress,location",
        },
      }),
    );
  });

  it("maps localized Autocomplete suggestions into place predictions", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: "ChIJ-anguk",
                text: { text: "Anguk Station, Seoul, South Korea" },
                structuredFormat: {
                  mainText: { text: "Anguk Station" },
                  secondaryText: { text: "Seoul, South Korea" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      searchGooglePlacePredictions("a", "test-key", {
        locale: "ko",
        fetcher,
        referrer: "http://localhost:3000/",
        sessionToken: "session-token",
      }),
    ).resolves.toEqual([
      {
        placeId: "ChIJ-anguk",
        mainText: "Anguk Station",
        secondaryText: "Seoul, South Korea",
        text: "Anguk Station, Seoul, South Korea",
      },
    ]);

    expect(fetcher).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:autocomplete",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "http://localhost:3000/",
          "X-Goog-Api-Key": "test-key",
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: "a",
          includedRegionCodes: ["kr"],
          languageCode: "ko",
          regionCode: "KR",
          sessionToken: "session-token",
        }),
      }),
    );
  });

  it("searches addresses through the same-origin BFF", async () => {
    const predictions = [
      {
        placeId: "ChIJ-anguk",
        mainText: "Anguk Station",
        secondaryText: "Seoul, South Korea",
        text: "Anguk Station, Seoul, South Korea",
      },
    ];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(predictions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(searchGooglePlacePredictionsViaBff("Anguk", "en", fetcher)).resolves.toEqual(
      predictions,
    );
    expect(fetcher).toHaveBeenCalledWith("/api/google/places/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Anguk", locale: "en" }),
    });
  });

  it("loads formatted address details through the same-origin BFF", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          formattedAddress: "Jongno-gu, Seoul",
          latitude: 37.579617,
          longitude: 126.977041,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      fetchGooglePlaceDetailsViaBff("places/ChIJ-anguk", "ko", fetcher),
    ).resolves.toEqual({
      formattedAddress: "Jongno-gu, Seoul",
      latitude: 37.579617,
      longitude: 126.977041,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/google/places/ChIJ-anguk?locale=ko");
  });
});
