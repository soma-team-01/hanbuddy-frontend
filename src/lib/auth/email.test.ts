import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isValidNewPassword,
  emailErrorKey,
  requestEmailAuth,
  readEmailCodeFailure,
  readEmailLoginFailure,
} from "./email";

afterEach(() => vi.unstubAllGlobals());
it.each([
  null,
  {},
  { failedAttempts: "5", maxAttempts: 5, retryAfterSeconds: 300 },
  { failedAttempts: -1, maxAttempts: 5, retryAfterSeconds: 300 },
  { failedAttempts: 6, maxAttempts: 5, retryAfterSeconds: 300 },
  { failedAttempts: 4.5, maxAttempts: 5, retryAfterSeconds: 300 },
  { failedAttempts: 5, maxAttempts: 0, retryAfterSeconds: 300 },
  { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: -1 },
  { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: 301 },
  { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: 0.5 },
  { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: 0 },
  { failedAttempts: 4, maxAttempts: 5, retryAfterSeconds: 300 },
])("ignores malformed or inconsistent login lock metadata: %j", (value) => {
  expect(readEmailLoginFailure("AUTH429_EMAIL_LOGIN", value)).toBeUndefined();
});
it("does not infer an account lock from IP limits or contradictory credential failures", () => {
  const details = { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: 300 };
  expect(readEmailLoginFailure("AUTH429_EMAIL", details)).toBeUndefined();
  expect(readEmailLoginFailure("AUTH401_EMAIL_LOGIN", details)).toBeUndefined();
  expect(
    readEmailLoginFailure("AUTH401_EMAIL_LOGIN", { ...details, retryAfterSeconds: 0 }),
  ).toBeUndefined();
  expect(emailErrorKey("AUTH429_EMAIL_LOGIN", 429)).toBe("loginBlocked");
  expect(emailErrorKey("AUTH429_EMAIL", 429)).toBe("rateLimit");
});
it.each([
  ["AUTH401_EMAIL_LOGIN", 401, { failedAttempts: 2, maxAttempts: 5, retryAfterSeconds: 0 }],
  ["AUTH429_EMAIL_LOGIN", 429, { failedAttempts: 5, maxAttempts: 5, retryAfterSeconds: 120 }],
])("preserves login metadata and never retries %s", async (code, status, result) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ isSuccess: false, code, result }, { status }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(requestEmailAuth("login", {})).rejects.toMatchObject({
    code,
    status,
    loginFailure: result,
    codeFailure: undefined,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each([
  null,
  {},
  { failedAttempts: "1", maxAttempts: 5, resendRequired: false },
  { failedAttempts: -1, maxAttempts: 5, resendRequired: false },
  { failedAttempts: 6, maxAttempts: 5, resendRequired: false },
  { failedAttempts: 1.5, maxAttempts: 5, resendRequired: false },
  { failedAttempts: 1, maxAttempts: 0, resendRequired: false },
  { failedAttempts: 1, maxAttempts: 5, resendRequired: "false" },
])("ignores malformed attempt metadata: %j", (value) => {
  expect(readEmailCodeFailure("AUTH400_EMAIL_CODE", value)).toBeUndefined();
});
it("does not interpret unrelated errors as verification attempts", () => {
  expect(
    readEmailCodeFailure("AUTH429_EMAIL", {
      failedAttempts: 1,
      maxAttempts: 5,
      resendRequired: false,
    }),
  ).toBeUndefined();
  expect(emailErrorKey("AUTH429_EMAIL_CODE_ATTEMPTS", 429)).toBe("codeAttemptsExceeded");
  expect(emailErrorKey("AUTH400_EMAIL_CODE_UNAVAILABLE", 400)).toBe("codeUnavailable");
});
it.each([
  ["AUTH400_EMAIL_CODE", 400, { failedAttempts: 3, maxAttempts: 5, resendRequired: false }],
  ["AUTH429_EMAIL_CODE_ATTEMPTS", 429, { failedAttempts: 5, maxAttempts: 5, resendRequired: true }],
  [
    "AUTH400_EMAIL_CODE_UNAVAILABLE",
    400,
    { failedAttempts: null, maxAttempts: 5, resendRequired: true },
  ],
])("preserves verification failure metadata for %s", async (code, status, result) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ isSuccess: false, code, result }, { status })),
  );
  await expect(requestEmailAuth("code/verify", {})).rejects.toMatchObject({
    code,
    status,
    codeFailure: result,
  });
});
it("sends bodyless reset validation with only the temporary bearer credential", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      isSuccess: true,
      code: "OK",
      result: { valid: true, expiresInSeconds: 540 },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await requestEmailAuth("password/reset/validate", undefined, { token: "reset-secret" }),
  ).toEqual({ valid: true, expiresInSeconds: 540 });
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    "/api/auth/email/password/reset/validate",
    expect.objectContaining({
      method: "POST",
      body: undefined,
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: "Bearer reset-secret" },
    }),
  );
});
it("does not refresh or retry an expired reset validation token", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ isSuccess: false, code: "TOKEN401_EXPIRED" }, { status: 401 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    requestEmailAuth("password/reset/validate", undefined, { token: "expired" }),
  ).rejects.toMatchObject({ status: 401, code: "TOKEN401_EXPIRED" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

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
    expect(emailErrorKey("AUTH409_GOOGLE_LOGIN", 409)).toBe("googleLoginRequired");
    expect(emailErrorKey("AUTH503_EMAIL", 503)).toBe("emailDeliveryUnavailable");
    expect(emailErrorKey("AUTH_PROXY_ERROR", 502)).toBe("unavailable");
    expect(emailErrorKey("UNKNOWN_CONFLICT", 409)).toBe("unavailable");
  });
});
