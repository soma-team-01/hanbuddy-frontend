import { describe, expect, it } from "vitest";
import { isValidNewPassword, emailErrorKey } from "./email";

describe("email password policy", () => {
  it("requires 8–64 UTF-16 units and at most 72 UTF-8 bytes without character combination rules", () => {
    expect(isValidNewPassword("a".repeat(7))).toBe(false);
    expect(isValidNewPassword("a".repeat(8))).toBe(true);
    expect(isValidNewPassword("12345678")).toBe(true);
    expect(isValidNewPassword("a".repeat(64))).toBe(true);
    expect(isValidNewPassword("a".repeat(65))).toBe(false);
    expect(isValidNewPassword("한".repeat(24))).toBe(true);
    expect(isValidNewPassword("한".repeat(25))).toBe(false);
    expect(isValidNewPassword("😀".repeat(18))).toBe(true);
    expect(isValidNewPassword("😀".repeat(19))).toBe(false);
    expect(isValidNewPassword(" ".repeat(8))).toBe(false);
    expect(isValidNewPassword(" a long password ")).toBe(true);
  });
  it("separates login failures, temporary token expiry and rate limits", () => {
    expect(emailErrorKey("AUTH401_EMAIL_LOGIN", 401)).toBe("credentials");
    expect(emailErrorKey("AUTH401_SIGNUP_TOKEN_USED", 401)).toBe("expired");
    expect(emailErrorKey("AUTH429_EMAIL", 429)).toBe("rateLimit");
    expect(emailErrorKey("AUTH400_EMAIL_CODE", 400)).toBe("codeInvalid");
    expect(emailErrorKey("AUTH409", 409)).toBe("duplicate");
    expect(emailErrorKey("AUTH503_EMAIL", 503)).toBe("emailDeliveryUnavailable");
    expect(emailErrorKey("AUTH_PROXY_ERROR", 502)).toBe("unavailable");
    expect(emailErrorKey("UNKNOWN_CONFLICT", 409)).toBe("unavailable");
  });
});
