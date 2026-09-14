import { NextRequest, NextResponse } from "next/server";
import { getLocaleOrDefault } from "@/i18n/routing";
import { localizePathname } from "@/i18n/pathname";
import { appendBackendSetCookies, postBackend } from "@/lib/auth/backend";
import {
  AUTH_COOKIES,
  RESUBMISSION_COOKIE_OPTIONS,
  clearAuthenticatedSessionCookies,
  clearAuthStatusReasonCookie,
  clearResubmissionCookie,
  clearSignupCookies,
  setAuthStatusReasonCookie,
  setAuthenticatedSessionCookies,
} from "@/lib/auth/cookies";
import { isReviewLoginEnabled } from "@/lib/auth/review-login";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import type {
  ErrorApiResponse,
  GoogleLoginResponse,
  ReviewLoginRedirect,
  ReviewLoginRequest,
  UserType,
} from "@/lib/auth/types";

export const dynamic = "force-dynamic";

const PUBLIC_REVIEW_LOGIN_ERRORS = {
  AUTH400_REVIEW_LOGIN: {
    status: 400,
    message: "이메일과 비밀번호를 확인해 주세요.",
  },
  AUTH401_REVIEW_LOGIN: {
    status: 401,
    message: "이메일 또는 비밀번호를 확인해 주세요.",
  },
  AUTH404_REVIEW_LOGIN: {
    status: 404,
    message: "심사용 로그인을 사용할 수 없습니다.",
  },
  AUTH429_REVIEW_LOGIN: {
    status: 429,
    message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const;

export async function POST(request: NextRequest) {
  if (!isReviewLoginEnabled()) {
    return errorResponse(404, "AUTH404_REVIEW_LOGIN", "심사용 로그인을 사용할 수 없습니다.");
  }

  const credentials = await parseCredentials(request);
  if (!credentials) {
    return errorResponse(400, "AUTH400_REVIEW_LOGIN", "이메일과 비밀번호를 확인해 주세요.");
  }

  try {
    const backend = await postBackend<ReviewLoginRequest, GoogleLoginResponse>(
      "/auth/review/login",
      credentials,
    );

    if (!backend.payload.isSuccess) {
      return safeBackendErrorResponse(backend.status, backend.payload.code);
    }

    const result = backend.payload.result;
    if (!isUsableLoginResult(result)) {
      return errorResponse(502, "AUTH_PROXY_ERROR", "로그인 응답을 확인할 수 없습니다.");
    }

    const redirectTo = resolveRedirectTo(request, result);
    const response = NextResponse.json(
      {
        ...backend.payload,
        result: { redirectTo } satisfies ReviewLoginRedirect,
      },
      { status: backend.status },
    );

    applyLoginCookies(response, result, backend.setCookies);
    return response;
  } catch {
    return errorResponse(502, "AUTH_PROXY_ERROR", "인증 서버에 연결할 수 없습니다.");
  }
}

async function parseCredentials(request: NextRequest): Promise<ReviewLoginRequest | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== "object") return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const normalizedEmail = email.trim();
  if (
    !normalizedEmail ||
    normalizedEmail.length > 320 ||
    !normalizedEmail.includes("@") ||
    !password ||
    password.length > 100
  ) {
    return null;
  }

  return { email: normalizedEmail, password };
}

function isUsableLoginResult(result: GoogleLoginResponse) {
  if (!result.registered || !isUserType(result.userType)) return false;
  if (result.authStatus === "ONBOARDING_REQUIRED") return false;
  if (result.authStatus === "ACTIVE") return Boolean(result.accessToken);
  return ["PENDING_APPROVAL", "REJECTED", "SUSPENDED"].includes(result.authStatus);
}

function isUserType(value: unknown): value is UserType {
  return value === "TOURIST" || value === "BUDDY" || value === "ADMIN";
}

function resolveRedirectTo(request: NextRequest, result: GoogleLoginResponse) {
  const locale = getLocaleOrDefault(request.nextUrl.searchParams.get("locale"));
  if (result.authStatus === "ACTIVE") {
    if (result.userType === "ADMIN") return "/admin/users";

    const returnTo = sanitizeReturnToPath(request.nextUrl.searchParams.get("next"));
    const fallback = result.userType === "BUDDY" ? "/dashboard" : "/";
    return localizePathname(returnTo ?? fallback, locale);
  }

  if (result.userType === "ADMIN") return "/admin/login?error=adminOnly";
  const statusPath = result.userType === "BUDDY" ? "/buddy/auth/status" : "/auth/status";
  return `${localizePathname(statusPath, locale)}?status=${result.authStatus}`;
}

function applyLoginCookies(
  response: NextResponse,
  result: GoogleLoginResponse,
  backendSetCookies: readonly string[],
) {
  clearSignupCookies(response);

  if (result.authStatus === "ACTIVE") {
    setAuthenticatedSessionCookies(response, result);
    clearAuthStatusReasonCookie(response);
    clearResubmissionCookie(response);
    appendBackendSetCookies(response, backendSetCookies);
    return;
  }

  clearAuthenticatedSessionCookies(response);
  setAuthStatusReasonCookie(response, result.statusReason);
  if (result.authStatus === "REJECTED" && result.userType === "BUDDY" && result.resubmissionToken) {
    response.cookies.set(
      AUTH_COOKIES.resubmissionToken,
      result.resubmissionToken,
      RESUBMISSION_COOKIE_OPTIONS,
    );
  } else {
    clearResubmissionCookie(response);
  }
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      isSuccess: false,
      code,
      message,
    } satisfies ErrorApiResponse,
    { status },
  );
}

function safeBackendErrorResponse(status: number, code: string) {
  const publicError = PUBLIC_REVIEW_LOGIN_ERRORS[code as keyof typeof PUBLIC_REVIEW_LOGIN_ERRORS];
  if (!publicError || publicError.status !== status) {
    return errorResponse(502, "AUTH_PROXY_ERROR", "인증 서버에 연결할 수 없습니다.");
  }

  return errorResponse(publicError.status, code, publicError.message);
}
