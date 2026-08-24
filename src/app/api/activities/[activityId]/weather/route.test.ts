import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);

describe("GET /api/activities/[activityId]/weather", () => {
  beforeEach(() => mockedGetBackend.mockReset());

  it("proxies the public weather request with its supported language", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { available: false } },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/activities/42/weather?languageCode=ko"),
      { params: Promise.resolve({ activityId: "42" }) },
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/42/weather?languageCode=ko");
    expect(response.status).toBe(200);
  });

  it("falls back to English and encodes the activity id", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { available: false } },
      setCookies: [],
    });

    await GET(new NextRequest("http://localhost/api/activities/42/weather?languageCode=xx"), {
      params: Promise.resolve({ activityId: "42?debug=true" }),
    });

    expect(mockedGetBackend).toHaveBeenCalledWith(
      "/activities/42%3Fdebug%3Dtrue/weather?languageCode=en",
    );
  });
});
