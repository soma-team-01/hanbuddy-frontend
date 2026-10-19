import type { ApiResponse, ErrorApiResponse, GoogleSignupRequest } from "./types";

export interface EmailSignupRequest {
  name: string;
  password: string;
  profile: GoogleSignupRequest;
}
export interface EmailVerificationResponse {
  verificationToken: string;
  purpose: "SIGNUP";
  expiresInSeconds: number;
}
export interface EmailSignupSession {
  email: string;
  expiresAt: number;
}
export interface PasswordResetValidation {
  valid: true;
  expiresInSeconds: number;
}
export function isPasswordResetValidation(value: unknown): value is PasswordResetValidation {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PasswordResetValidation>;
  return (
    result.valid === true &&
    typeof result.expiresInSeconds === "number" &&
    Number.isSafeInteger(result.expiresInSeconds) &&
    result.expiresInSeconds > 0
  );
}
export type EmailAction =
  | "code"
  | "code/verify"
  | "signup"
  | "login"
  | "password/reset-link"
  | "password/reset"
  | "password/reset/validate";

export type EmailErrorKey = ReturnType<typeof emailErrorKey> | "mismatch";

export interface EmailCodeFailure {
  failedAttempts: number | null;
  maxAttempts: number;
  resendRequired: boolean;
}

export interface EmailLoginFailure {
  failedAttempts: number;
  maxAttempts: number;
  retryAfterSeconds: number;
}

export function readEmailLoginFailure(code: string, value: unknown): EmailLoginFailure | undefined {
  if (
    !["AUTH401_EMAIL_LOGIN", "AUTH429_EMAIL_LOGIN"].includes(code) ||
    !value ||
    typeof value !== "object"
  )
    return undefined;
  const { failedAttempts, maxAttempts, retryAfterSeconds } = value as Partial<EmailLoginFailure>;
  if (
    typeof maxAttempts !== "number" ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts <= 0 ||
    typeof failedAttempts !== "number" ||
    !Number.isSafeInteger(failedAttempts) ||
    failedAttempts < 1 ||
    failedAttempts > maxAttempts ||
    typeof retryAfterSeconds !== "number" ||
    !Number.isSafeInteger(retryAfterSeconds) ||
    retryAfterSeconds < 0 ||
    retryAfterSeconds > 300
  )
    return undefined;
  if (
    code === "AUTH401_EMAIL_LOGIN"
      ? retryAfterSeconds !== 0 || failedAttempts >= maxAttempts
      : retryAfterSeconds === 0 || failedAttempts !== maxAttempts
  )
    return undefined;
  return { failedAttempts, maxAttempts, retryAfterSeconds };
}

/** Only expose the documented verification metadata, never arbitrary backend error results. */
export function readEmailCodeFailure(code: string, value: unknown): EmailCodeFailure | undefined {
  if (
    ![
      "AUTH400_EMAIL_CODE",
      "AUTH400_EMAIL_CODE_UNAVAILABLE",
      "AUTH429_EMAIL_CODE_ATTEMPTS",
    ].includes(code) ||
    !value ||
    typeof value !== "object"
  )
    return undefined;
  const { failedAttempts, maxAttempts, resendRequired } = value as Partial<EmailCodeFailure>;
  if (
    typeof maxAttempts !== "number" ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts <= 0 ||
    typeof resendRequired !== "boolean"
  )
    return undefined;
  if (
    failedAttempts !== null &&
    (typeof failedAttempts !== "number" ||
      !Number.isSafeInteger(failedAttempts) ||
      failedAttempts < 0 ||
      failedAttempts > maxAttempts)
  )
    return undefined;
  return { failedAttempts, maxAttempts, resendRequired };
}

export function isValidNewPassword(password: string) {
  return (
    password.length >= 8 &&
    password.length <= 64 &&
    password.trim().length > 0 &&
    new TextEncoder().encode(password).length <= 72
  );
}

export function emailErrorKey(code?: string, status?: number) {
  if (code === "AUTH401_EMAIL_LOGIN") return "credentials";
  if (code === "AUTH429_EMAIL_LOGIN") return "loginBlocked";
  if (status === 401) return "expired";
  if (code === "AUTH429_EMAIL_CODE_ATTEMPTS") return "codeAttemptsExceeded";
  if (code === "AUTH400_EMAIL_CODE_UNAVAILABLE") return "codeUnavailable";
  if (status === 429) return "rateLimit";
  if (code === "AUTH400_EMAIL_CODE") return "codeInvalid";
  if (code === "AUTH400_PASSWORD") return "passwordInvalid";
  if (code === "AUTH409") return "duplicate";
  if (code === "AUTH409_GOOGLE_LOGIN") return "googleLoginRequired";
  if (code === "AUTH503_EMAIL") return "emailDeliveryUnavailable";
  if (status === 400) return "invalid";
  return "unavailable";
}

export class EmailAuthError extends Error {
  readonly codeFailure?: EmailCodeFailure;
  readonly loginFailure?: EmailLoginFailure;
  constructor(
    readonly code: string,
    readonly status: number,
    details?: unknown,
  ) {
    super("Email authentication request failed");
    this.codeFailure = readEmailCodeFailure(code, details);
    this.loginFailure = readEmailLoginFailure(code, details);
  }
}

/** Temporary-token endpoints never retry via the access-token refresh client. */
export async function requestEmailAuth<T>(
  action: EmailAction,
  body: unknown,
  options: { token?: string; query?: string } = {},
): Promise<T> {
  const response = await fetch(
    `/api/auth/email/${action}${options.query ? `?${options.query}` : ""}`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    ApiResponse<T> | ErrorApiResponse | null;
  if (!response.ok || !payload?.isSuccess)
    throw new EmailAuthError(
      payload?.code ?? "AUTH_PROXY_ERROR",
      response.status,
      action === "code/verify"
        ? readEmailCodeFailure(payload?.code ?? "", payload?.result)
        : action === "login"
          ? readEmailLoginFailure(payload?.code ?? "", payload?.result)
          : undefined,
    );
  return payload.result;
}
