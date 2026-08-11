import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api/errors";
import type { ApiResult } from "@/lib/api/result";
import { UnauthenticatedQueryError, unwrapApiResult } from "./result";

describe("unwrapApiResult", () => {
  it("returns the successful result field", () => {
    const result: ApiResult<string[], "items"> = {
      status: "success",
      items: ["one", "two"],
    };

    expect(unwrapApiResult(result, "items")).toEqual(["one", "two"]);
  });

  it("throws the structured ApiClientError unchanged", () => {
    const error = new ApiClientError({
      code: "ACTIVITY404",
      status: 404,
      details: null,
      backendMessage: "raw backend message",
    });
    const result: ApiResult<string[], "items"> = {
      status: "error",
      error,
    };

    expect(() => unwrapApiResult(result, "items")).toThrow(error);
  });

  it("throws UnauthenticatedQueryError for an expired session", () => {
    const result: ApiResult<string[], "items"> = { status: "unauthenticated" };

    expect(() => unwrapApiResult(result, "items")).toThrow(UnauthenticatedQueryError);
  });
});
