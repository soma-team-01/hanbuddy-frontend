import { describe, expect, it } from "vitest";
import { ApiClientError } from "./errors";

describe("ApiClientError", () => {
  it("keeps the backend message out of the standard Error message", () => {
    const error = new ApiClientError({
      code: "VALIDATION400_FORMAT",
      status: 400,
      details: null,
      backendMessage: "백엔드 원문 오류",
      fallbackMessage: "API request failed",
    });

    expect(error.message).toBe("API request failed");
    expect(error.backendMessage).toBe("백엔드 원문 오류");
  });

  it("uses a safe default when no fallback message is provided", () => {
    const error = new ApiClientError({
      code: "SERVER500_INTERNAL",
      status: 500,
      details: null,
      backendMessage: "내부 서버 예외 상세",
    });

    expect(error.message).toBe("API request failed");
    expect(error.backendMessage).toBe("내부 서버 예외 상세");
  });
});
