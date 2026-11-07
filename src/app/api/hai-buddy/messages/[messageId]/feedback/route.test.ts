import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);

function request(rating: unknown, messageId = "501") {
  return [
    new NextRequest(`http://localhost/api/hai-buddy/messages/${messageId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating }),
      headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
    }),
    { params: Promise.resolve({ messageId }) },
  ] as const;
}

describe("POST /api/hai-buddy/messages/[messageId]/feedback", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: null },
      setCookies: [],
    });
  });

  it("forwards UP or DOWN for a numeric message id", async () => {
    const response = await POST(...request("UP"));

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/hai-buddy/messages/501/feedback",
      { rating: "UP" },
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it.each([
    ["SIDEWAYS", "501"],
    ["UP", "../admin"],
  ])("rejects rating %s for message %s without calling the backend", async (rating, messageId) => {
    const response = await POST(...request(rating, messageId));

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
