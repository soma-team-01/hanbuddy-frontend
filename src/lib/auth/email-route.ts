import { NextRequest, NextResponse } from "next/server";
import { getLocaleOrDefault } from "@/i18n/routing";
import { localizePathname } from "@/i18n/pathname";
import { appendBackendSetCookies, postBackend } from "./backend";
import {
  AUTH_COOKIES,
  SESSION_COOKIE_OPTIONS,
  RESUBMISSION_COOKIE_OPTIONS,
  clearAuthenticatedSessionCookies,
  clearAuthStatusReasonCookie,
  clearResubmissionCookie,
  clearSignupCookies,
  setAuthenticatedSessionCookies,
  setAuthStatusReasonCookie,
} from "./cookies";
import {
  isValidNewPassword,
  isPasswordResetValidation,
  readEmailCodeFailure,
  type EmailCodeFailure,
  type EmailAction,
  type EmailVerificationResponse,
} from "./email";
import { readEmailSignupSession } from "./email-session";
import { sanitizeReturnToPath } from "./return-to";
import type { GoogleLoginResponse } from "./types";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
function failure(status: number, code = "COMMON400", result?: EmailCodeFailure) {
  return NextResponse.json(
    {
      isSuccess: false,
      code,
      message: "Authentication request failed.",
      ...(result ? { result } : {}),
    },
    { status, headers },
  );
}
function success(result: unknown, status = 200) {
  return NextResponse.json(
    { isSuccess: true, code: "OK", message: "OK", result },
    { status, headers },
  );
}

function parseBody(action: EmailAction, body: Record<string, unknown>) {
  if (action === "signup") {
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 100 ||
      !body.profile ||
      typeof body.profile !== "object"
    )
      return null;
    if (typeof body.password !== "string" || !isValidNewPassword(body.password)) return null;
    return { name: body.name.trim(), password: body.password, profile: body.profile };
  }
  if (action === "password/reset")
    return typeof body.password === "string" && isValidNewPassword(body.password)
      ? { password: body.password }
      : null;
  if (
    typeof body.email !== "string" ||
    body.email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  )
    return null;
  const email = body.email.trim();
  if (action === "login")
    return typeof body.password === "string" &&
      body.password.trim().length > 0 &&
      body.password.length <= 64
      ? { email, password: body.password }
      : null;
  if (action === "password/reset-link") return { email };
  if (body.purpose !== "SIGNUP") return null;
  if (action === "code") return { email, purpose: "SIGNUP" };
  return typeof body.code === "string" && /^\d{6}$/.test(body.code)
    ? { email, purpose: "SIGNUP", code: body.code }
    : null;
}

function sessionResponse(
  request: NextRequest,
  result: GoogleLoginResponse,
  status: number,
  setCookies: string[],
) {
  if (
    !result?.registered ||
    !["TOURIST", "BUDDY", "ADMIN"].includes(result.userType ?? "") ||
    !["ACTIVE", "PENDING_APPROVAL", "REJECTED", "SUSPENDED"].includes(result.authStatus) ||
    (result.authStatus === "ACTIVE" && (!result.accessToken || !result.userId))
  )
    return failure(502, "AUTH_PROXY_ERROR");
  const locale =
    result.userType === "BUDDY"
      ? "ko"
      : getLocaleOrDefault(request.nextUrl.searchParams.get("locale"));
  const active = result.authStatus === "ACTIVE";
  const destination =
    result.userType === "BUDDY"
      ? "/dashboard"
      : (sanitizeReturnToPath(request.nextUrl.searchParams.get("next")) ?? "/");
  const statusPath = result.userType === "BUDDY" ? "/buddy/auth/status" : "/auth/status";
  const redirectTo = active
    ? result.userType === "ADMIN"
      ? "/admin/users"
      : localizePathname(destination, locale)
    : `${localizePathname(statusPath, locale)}?status=${result.authStatus}`;
  const response = success(
    { registered: result.registered, authStatus: result.authStatus, redirectTo },
    status,
  );
  clearSignupCookies(response);
  clearResubmissionCookie(response);
  clearAuthenticatedSessionCookies(response);
  if (active) {
    setAuthenticatedSessionCookies(response, result);
    clearAuthStatusReasonCookie(response);
    appendBackendSetCookies(response, setCookies);
  } else {
    setAuthStatusReasonCookie(response, result.statusReason);
    if (result.authStatus === "REJECTED" && result.userType === "BUDDY" && result.resubmissionToken)
      response.cookies.set(
        AUTH_COOKIES.resubmissionToken,
        result.resubmissionToken,
        RESUBMISSION_COOKIE_OPTIONS,
      );
  }
  return response;
}

/** Public email endpoints have independent temporary credentials, with no access-token refresh. */
export async function handleEmailAuth(request: NextRequest, action: EmailAction) {
  const response = await performEmailAuth(request, action);
  // Starting another verification attempt invalidates old signup state even if sending fails.
  if (action === "code" && response.status !== 403) clearSignupCookies(response);
  return response;
}

async function performEmailAuth(request: NextRequest, action: EmailAction) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return failure(403);
  if (action === "password/reset/validate") return validateResetToken(request);
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return failure(400);
  const body = parseBody(action, raw);
  if (!body) return failure(400);
  let bearerToken: string | undefined;
  if (action === "signup") {
    const session = readEmailSignupSession(request.cookies.get(AUTH_COOKIES.emailSignup)?.value);
    bearerToken = request.cookies.get(AUTH_COOKIES.signupToken)?.value;
    if (!session || session.expiresAt <= Date.now() || !bearerToken)
      return failure(401, "TOKEN401_EXPIRED");
  }
  if (action === "password/reset") {
    bearerToken = request.headers.get("authorization")?.match(/^Bearer ([^\s]{1,4096})$/)?.[1];
    if (!bearerToken) return failure(401, "TOKEN401");
  }
  try {
    const backend = await postBackend(
      `/auth/email/${action}`,
      body,
      bearerToken ? { bearerToken } : {},
    );
    if (!backend.payload.isSuccess)
      return failure(
        backend.status >= 400 ? backend.status : 502,
        backend.payload.code,
        action === "code/verify"
          ? readEmailCodeFailure(backend.payload.code, backend.payload.result)
          : undefined,
      );
    if (action === "login" || action === "signup")
      return sessionResponse(
        request,
        backend.payload.result as GoogleLoginResponse,
        backend.status,
        backend.setCookies,
      );
    if (action === "code/verify") {
      const result = backend.payload.result as EmailVerificationResponse;
      if (
        result?.purpose !== "SIGNUP" ||
        typeof result.verificationToken !== "string" ||
        !result.verificationToken ||
        !Number.isInteger(result.expiresInSeconds) ||
        result.expiresInSeconds <= 0
      )
        return failure(502, "AUTH_PROXY_ERROR");
      const expiresAt = Date.now() + result.expiresInSeconds * 1000;
      const response = success({ expiresAt });
      clearSignupCookies(response);
      const options = { ...SESSION_COOKIE_OPTIONS, maxAge: result.expiresInSeconds };
      response.cookies.set(AUTH_COOKIES.signupToken, result.verificationToken, options);
      response.cookies.set(
        AUTH_COOKIES.emailSignup,
        Buffer.from(JSON.stringify({ email: raw.email.trim(), expiresAt })).toString("base64url"),
        options,
      );
      return response;
    }
    const response = success({ accepted: true });
    if (action === "code") clearSignupCookies(response);
    if (action === "password/reset") {
      for (const name of Object.values(AUTH_COOKIES)) response.cookies.delete(name);
      appendBackendSetCookies(response, backend.setCookies);
    }
    return response;
  } catch {
    return failure(502, "AUTH_PROXY_ERROR");
  }
}

async function validateResetToken(request: NextRequest) {
  const bearerToken = request.headers.get("authorization")?.match(/^Bearer ([^\s]{1,4096})$/)?.[1];
  if (!bearerToken) return failure(401, "TOKEN401");
  try {
    const backend = await postBackend("/auth/email/password/reset/validate", undefined, {
      bearerToken,
    });
    if (backend.status >= 400 || !backend.payload.isSuccess)
      return failure(backend.status >= 400 ? backend.status : 502, backend.payload.code);
    const result = backend.payload.result;
    if (!isPasswordResetValidation(result)) return failure(502, "AUTH_PROXY_ERROR");
    // Validation must never consume/reset credentials or touch authenticated-session cookies.
    return success({ valid: true, expiresInSeconds: result.expiresInSeconds });
  } catch {
    return failure(502, "AUTH_PROXY_ERROR");
  }
}
