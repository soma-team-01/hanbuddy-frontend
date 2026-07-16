export const AUTH_ERROR_CODES = [
  "googleCancelled",
  "missingCode",
  "invalidState",
  "backendRejected",
  "invalidLoginResponse",
  "missingSignupToken",
  "serverUnavailable",
  "configuration",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export function parseAuthErrorCode(value: unknown): AuthErrorCode {
  return typeof value === "string" && AUTH_ERROR_CODES.includes(value as AuthErrorCode)
    ? (value as AuthErrorCode)
    : "unknown";
}
