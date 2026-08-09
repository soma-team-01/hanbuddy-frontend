import { describe, expect, it } from "vitest";
import { ApiClientError } from "./errors";
import {
  BACKEND_ERROR_CODES,
  ERROR_CODE_MESSAGE_KEYS,
  resolveApiErrorMessageKey,
} from "./error-messages";

function apiError(code: string | null, status: number | null) {
  return new ApiClientError({
    code,
    status,
    details: null,
    backendMessage: "never render me",
  });
}

describe("API error message registry", () => {
  it("recognizes every OpenAPI error code", () => {
    expect(BACKEND_ERROR_CODES).toHaveLength(40);
    expect(Object.keys(ERROR_CODE_MESSAGE_KEYS).sort()).toEqual([...BACKEND_ERROR_CODES].sort());
  });

  it("groups payment gateway failures under one user message", () => {
    for (const code of [
      "PAYMENT502_TOSS_CANCEL",
      "PAYMENT502_TOSS_CONFIRM",
      "PAYMENT502_TOSS_LOOKUP",
    ]) {
      expect(resolveApiErrorMessageKey(apiError(code, 502))).toBe("paymentServiceUnavailable");
    }
  });

  it("prefers a known code over its HTTP category", () => {
    expect(resolveApiErrorMessageKey(apiError("APPLICATION400_CAPACITY_EXCEEDED", 500))).toBe(
      "applicationCapacityExceeded",
    );
  });

  it.each([
    [403, "permissionDenied"],
    [404, "resourceNotFound"],
    [409, "conflict"],
    [500, "serverUnavailable"],
    [503, "serverUnavailable"],
  ] as const)("uses the %s category for unknown codes", (status, key) => {
    expect(resolveApiErrorMessageKey(apiError("NEW_BACKEND_CODE", status))).toBe(key);
  });

  it("maps the BFF proxy code to a safe service message", () => {
    expect(resolveApiErrorMessageKey(apiError("AUTH_PROXY_ERROR", 502))).toBe("serverUnavailable");
  });

  it("returns null for errors with no usable code or status", () => {
    expect(resolveApiErrorMessageKey(apiError(null, null))).toBeNull();
    expect(resolveApiErrorMessageKey(new Error("raw"))).toBeNull();
  });
});
