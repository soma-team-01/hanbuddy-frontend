import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { searchGooglePlacePredictions } from "@/lib/google/places";
import { POST } from "./route";

vi.mock("@/lib/google/places", () => ({
  getGoogleMapsApiKey: () => "test-key",
  searchGooglePlacePredictions: vi.fn().mockResolvedValue([
    {
      placeId: "ChIJ-anguk",
      mainText: "Anguk Station",
      secondaryText: "Seoul",
      text: "Anguk Station, Seoul",
    },
  ]),
}));

describe("POST /api/google/places/autocomplete", () => {
  it("proxies localized address predictions through the server", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/google/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "Anguk", locale: "ko" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ placeId: "ChIJ-anguk" }),
    ]);
    expect(searchGooglePlacePredictions).toHaveBeenCalledWith("Anguk", "test-key", {
      locale: "ko",
      referrer: "http://localhost:3000/",
    });
  });
});
