import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { HAI_BUDDY_TIMEOUT_MS } from "@/lib/api/hai-buddy-config";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const body = {
  message: "How do I pay?",
  context: { page: "HOME", language: "EN", locale: "en" },
};

function request(withToken = true) {
  return new NextRequest("http://localhost/api/hai-buddy/messages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: withToken ? { cookie: `${AUTH_COOKIES.accessToken}=access-token` } : {},
  });
}

describe("POST /api/hai-buddy/messages", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when signed out", async () => {
    const response = await POST(request(false));

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("forwards the question with the bearer token and the longer agent timeout", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { reply: "PayPal." } },
      setCookies: [],
    });

    const response = await POST(request());

    expect(mockedPostBackend).toHaveBeenCalledWith("/hai-buddy/messages", body, {
      bearerToken: "access-token",
      timeoutMs: HAI_BUDDY_TIMEOUT_MS,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ result: { reply: "PayPal." } });
  });

  it.each([
    [429, "HAIBUDDY429_DAILY"],
    [404, "HAIBUDDY404_DISABLED"],
    [503, "HAIBUDDY503_LIMIT"],
  ])("passes a backend %i (%s) through unchanged", async (status, code) => {
    mockedPostBackend.mockResolvedValue({
      status,
      payload: { isSuccess: false, code, message: "limit" },
      setCookies: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
  });
});
