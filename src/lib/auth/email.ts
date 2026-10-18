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
export type EmailAction =
  "code" | "code/verify" | "signup" | "login" | "password/reset-link" | "password/reset";

export type EmailErrorKey = ReturnType<typeof emailErrorKey> | "mismatch";

export function isValidNewPassword(password: string) {
  return (
    password.length >= 15 &&
    password.length <= 64 &&
    password.trim().length > 0 &&
    new TextEncoder().encode(password).length <= 72
  );
}

export function emailErrorKey(code?: string, status?: number) {
  if (code === "AUTH401_EMAIL_LOGIN") return "credentials";
  if (status === 401) return "expired";
  if (status === 429) return "rateLimit";
  if (code === "AUTH400_EMAIL_CODE") return "codeInvalid";
  if (code === "AUTH400_PASSWORD") return "passwordInvalid";
  if (code === "AUTH409") return "duplicate";
  if (status === 400) return "invalid";
  return "unavailable";
}

export class EmailAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super("Email authentication request failed");
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
    throw new EmailAuthError(payload?.code ?? "AUTH_PROXY_ERROR", response.status);
  return payload.result;
}
