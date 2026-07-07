import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendBackendSetCookies,
  BACKEND_REQUEST_TIMEOUT_MS,
  getBackendApiBaseUrl,
  getSetCookieHeaders,
  postBackend,
} from "./backend";

const originalApiBaseUrl = process.env.HANBUDDY_API_BASE_URL;

describe("getBackendApiBaseUrl", () => {
  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.HANBUDDY_API_BASE_URL;
      return;
    }

    process.env.HANBUDDY_API_BASE_URL = originalApiBaseUrl;
  });

  it("requires HANBUDDY_API_BASE_URL instead of falling back to an insecure default", () => {
    delete process.env.HANBUDDY_API_BASE_URL;

    expect(() => getBackendApiBaseUrl()).toThrow("HANBUDDY_API_BASE_URL");
  });

  it("normalizes a configured API base URL", () => {
    process.env.HANBUDDY_API_BASE_URL = "https://api.hanbuddy.test/api/v1/";

    expect(getBackendApiBaseUrl()).toBe("https://api.hanbuddy.test/api/v1");
  });
});

describe("postBackend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (originalApiBaseUrl === undefined) {
      delete process.env.HANBUDDY_API_BASE_URL;
      return;
    }

    process.env.HANBUDDY_API_BASE_URL = originalApiBaseUrl;
  });

  it("posts JSON to the configured backend and returns parsed payload and cookies", async () => {
    process.env.HANBUDDY_API_BASE_URL = "https://api.hanbuddy.test/api/v1";
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ isSuccess: true, code: "OK", message: "ok", result: "done" }), {
        status: 200,
        headers: {
          "set-cookie": "refresh_token=abc; Path=/; HttpOnly",
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      postBackend<{ code: string }, string>("/auth/google/login", { code: "google-code" }),
    ).resolves.toMatchObject({
      status: 200,
      payload: { isSuccess: true, result: "done" },
      setCookies: ["refresh_token=abc; Path=/; HttpOnly"],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.hanbuddy.test/api/v1/auth/google/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "google-code" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("returns a proxy error response when the backend request times out", async () => {
    vi.useFakeTimers();
    process.env.HANBUDDY_API_BASE_URL = "https://api.hanbuddy.test/api/v1";
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        const signal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      }),
    );

    const backendResponse = postBackend<undefined, string>("/auth/logout");
    await vi.advanceTimersByTimeAsync(BACKEND_REQUEST_TIMEOUT_MS);

    await expect(backendResponse).resolves.toMatchObject({
      status: 504,
      payload: {
        isSuccess: false,
        code: "AUTH_PROXY_ERROR",
        message: "인증 서버 응답이 지연되고 있습니다.",
      },
      setCookies: [],
    });
  });
});

describe("cookie header helpers", () => {
  it("splits combined Set-Cookie headers without splitting Expires commas", () => {
    const headers = new Headers({
      "set-cookie":
        "refresh_token=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly, session=def; Path=/; HttpOnly",
    });

    expect(getSetCookieHeaders(headers)).toEqual([
      "refresh_token=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly",
      "session=def; Path=/; HttpOnly",
    ]);
  });

  it("appends backend Set-Cookie values to a Next response", () => {
    const response = NextResponse.json({ ok: true });

    appendBackendSetCookies(response, [
      "refresh_token=abc; Path=/; HttpOnly",
      "session=def; Path=/; HttpOnly",
    ]);

    expect(response.headers.get("set-cookie")).toContain("refresh_token=abc");
    expect(response.headers.get("set-cookie")).toContain("session=def");
  });
});
