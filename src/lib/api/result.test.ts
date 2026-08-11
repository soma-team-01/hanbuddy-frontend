import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./errors";
import { requestApiResult } from "./result";

describe("requestApiResult", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves backend code, status, details, and debug message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: false,
            code: "APPLICATION400_CAPACITY_EXCEEDED",
            message: "raw backend message",
            result: { field: "guestCount" },
          }),
          { status: 400 },
        ),
      ),
    );

    const result = await requestApiResult(
      "/api/applications",
      "application",
      undefined,
      "fallback",
    );

    expect(result).toMatchObject({
      status: "error",
      error: {
        code: "APPLICATION400_CAPACITY_EXCEEDED",
        status: 400,
        details: { field: "guestCount" },
        backendMessage: "raw backend message",
      },
    });
    expect(result.status === "error" && result.error).toBeInstanceOf(ApiClientError);
  });

  it("returns a code-less structured error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(
      requestApiResult("/api/activities", "activities", undefined, "fallback"),
    ).resolves.toMatchObject({
      status: "error",
      error: { code: null, status: null, details: null, backendMessage: null },
    });
  });
});
