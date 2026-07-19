import { describe, expect, it } from "vitest";
import { AUTH_ERROR_CODES, parseAuthErrorCode } from "./error-codes";

describe("auth error codes", () => {
  it("accepts every public auth error code", () => {
    expect(AUTH_ERROR_CODES).toEqual([
      "googleCancelled",
      "missingCode",
      "invalidState",
      "backendRejected",
      "invalidLoginResponse",
      "missingSignupToken",
      "serverUnavailable",
      "configuration",
      "unknown",
    ]);

    for (const code of AUTH_ERROR_CODES) {
      expect(parseAuthErrorCode(code)).toBe(code);
    }
  });

  it.each([undefined, null, "", "raw backend failure", "GOOGLE_500", ["invalidState"]])(
    "maps an untrusted value (%s) to unknown",
    (value) => {
      expect(parseAuthErrorCode(value)).toBe("unknown");
    },
  );
});
