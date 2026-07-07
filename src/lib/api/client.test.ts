import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuthRetry } from "./client";

describe("fetchWithAuthRetry", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response as-is when it is not a 401", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const response = await fetchWithAuthRetry("/api/users/me");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/users/me", { credentials: "same-origin" });
  });

  it("refreshes the session and retries once after a 401", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const response = await fetchWithAuthRetry("/api/users/me");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/users/me", { credentials: "same-origin" });
  });

  it("returns the original 401 when the refresh fails", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: false }), { status: 401 }));
    vi.stubGlobal("fetch", fetch);

    const response = await fetchWithAuthRetry("/api/users/me");

    expect(response.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
