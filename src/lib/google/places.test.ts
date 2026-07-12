import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  searchGooglePlacePredictions,
} from "./places";

describe("Google Places helpers", () => {
  it("builds an Embed API place URL from a place id", () => {
    expect(buildGoogleMapsEmbedUrl("places/ChIJ-bukchon", "test-key")).toBe(
      "https://www.google.com/maps/embed/v1/place?key=test-key&q=place_id%3AChIJ-bukchon",
    );
  });

  it("fetches only the formatted address for a selected place", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ formattedAddress: "Jongno-gu, Seoul" }), {
        status: 200,
      }),
    );

    await expect(
      fetchGooglePlaceDetails("ChIJ-bukchon", "test-key", fetcher, "session-token"),
    ).resolves.toEqual({
      formattedAddress: "Jongno-gu, Seoul",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJ-bukchon?sessionToken=session-token",
      expect.objectContaining({
        headers: {
          "X-Goog-Api-Key": "test-key",
          "X-Goog-FieldMask": "formattedAddress",
        },
      }),
    );
  });

  it("maps Autocomplete suggestions into place predictions", async () => {
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
      searchGooglePlacePredictions("anguk", "test-key", fetcher, "session-token"),
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
          "X-Goog-Api-Key": "test-key",
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: "anguk",
          includedRegionCodes: ["kr"],
          languageCode: "en",
          sessionToken: "session-token",
        }),
      }),
    );
  });
});
