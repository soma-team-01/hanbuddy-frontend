import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { fetchGooglePlaceDetails } from "@/lib/google/places";
import { GET } from "./route";

vi.mock("@/lib/google/places", () => ({
  fetchGooglePlaceDetails: vi.fn().mockResolvedValue({
    formattedAddress: "서울특별시 종로구 율곡로 62",
  }),
  getGoogleMapsApiKey: () => "test-key",
}));

describe("GET /api/google/places/:placeId", () => {
  it("proxies localized formatted address details through the server", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/google/places/ChIJ-anguk?locale=ko"),
      { params: Promise.resolve({ placeId: "ChIJ-anguk" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      formattedAddress: "서울특별시 종로구 율곡로 62",
    });
    expect(fetchGooglePlaceDetails).toHaveBeenCalledWith("ChIJ-anguk", "test-key", {
      locale: "ko",
      referrer: "http://localhost:3000/",
    });
  });
});
