import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);

describe("GET /api/hai-buddy/conversations/latest", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { conversationId: null, messages: [] } },
      setCookies: [],
    });
  });

  it("returns 401 when signed out", async () => {
    const response = await GET(new NextRequest("http://localhost/api/hai-buddy/conversations/latest"));

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it.each([
    ["?language=JA", "/hai-buddy/conversations/latest?language=JA"],
    ["?language=xx", "/hai-buddy/conversations/latest"],
  ])("forwards only a valid language (%s)", async (query, backendPath) => {
    await GET(
      new NextRequest(`http://localhost/api/hai-buddy/conversations/latest${query}`, {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith(backendPath, { bearerToken: "access-token" });
  });
});
