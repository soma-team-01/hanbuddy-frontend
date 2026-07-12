import { describe, expect, it } from "vitest";
import type { ApiResult } from "@/lib/api/result";
import {
  ApiQueryError,
  UnauthenticatedQueryError,
  unwrapApiResult,
} from "./result";

describe("unwrapApiResult", () => {
  it("returns the successful result field", () => {
    const result: ApiResult<string[], "items"> = {
      status: "success",
      items: ["one", "two"],
    };

    expect(unwrapApiResult(result, "items")).toEqual(["one", "two"]);
  });

  it("throws ApiQueryError with the API message", () => {
    const result: ApiResult<string[], "items"> = {
      status: "error",
      message: "목록을 불러오지 못했습니다.",
    };

    expect(() => unwrapApiResult(result, "items")).toThrow(
      new ApiQueryError("목록을 불러오지 못했습니다."),
    );
  });

  it("throws UnauthenticatedQueryError for an expired session", () => {
    const result: ApiResult<string[], "items"> = { status: "unauthenticated" };

    expect(() => unwrapApiResult(result, "items")).toThrow(UnauthenticatedQueryError);
  });
});
