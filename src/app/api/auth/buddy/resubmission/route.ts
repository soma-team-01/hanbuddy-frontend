import { NextRequest, NextResponse } from "next/server";
import { createProxyErrorResponse, getBackend, putBackend } from "@/lib/auth/backend";
import {
  AUTH_COOKIES,
  clearAuthStatusReasonCookie,
  clearResubmissionCookie,
} from "@/lib/auth/cookies";
import type {
  BuddyResubmission,
  BuddyResubmissionRequest,
  ContactMethod,
  ErrorApiResponse,
} from "@/lib/auth/types";

export const dynamic = "force-dynamic";

const CONTACT_METHODS = new Set<ContactMethod>(["WHATSAPP", "LINE", "WECHAT", "PHONE"]);
const PROFILE_IMAGE_KEY_PATTERN =
  /^profiles\/\d{4}\/\d{2}\/\d{2}\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.(?:jpg|png|webp)$/;
const CONTACT_COUNTRY_CODE_PATTERN = /^(?:|\+\d{1,4})$/;
const CONTACT_IDENTIFIER_PATTERN = /^[A-Za-z0-9가-힣@._+\- ]{2,100}$/;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIES.resubmissionToken)?.value;
  if (!token) return missingTokenResponse();

  try {
    const backend = await getBackend<BuddyResubmission>("/auth/buddy/resubmission", {
      bearerToken: token,
    });
    const response = NextResponse.json(backend.payload, { status: backend.status });
    clearInvalidResubmissionCookie(response, backend.status, backend.payload);
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("재신청 정보를 불러올 수 없습니다."), {
      status: 502,
    });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIES.resubmissionToken)?.value;
  if (!token) return missingTokenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequestResponse();
  }

  if (!isBuddyResubmissionRequest(body)) return invalidRequestResponse();

  try {
    const backend = await putBackend<BuddyResubmissionRequest, BuddyResubmission>(
      "/auth/buddy/resubmission",
      body,
      { bearerToken: token },
    );
    const response = NextResponse.json(backend.payload, { status: backend.status });
    if (backend.payload.isSuccess) {
      clearResubmissionCookie(response);
      clearAuthStatusReasonCookie(response);
    } else {
      clearInvalidResubmissionCookie(response, backend.status, backend.payload);
    }
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("재신청을 처리할 수 없습니다."), {
      status: 502,
    });
  }
}

function missingTokenResponse() {
  return NextResponse.json(createProxyErrorResponse("재신청 세션이 만료되었습니다."), {
    status: 401,
  });
}

function invalidRequestResponse() {
  return NextResponse.json(createProxyErrorResponse("잘못된 재신청 요청입니다."), {
    status: 400,
  });
}

function clearInvalidResubmissionCookie(
  response: NextResponse,
  status: number,
  payload: ErrorApiResponse | { isSuccess: true },
) {
  if (
    !payload.isSuccess &&
    (status === 401 ||
      payload.code === "AUTH401_RESUBMISSION_TOKEN_USED" ||
      payload.code === "AUTH409_RESUBMISSION_STATE")
  ) {
    clearResubmissionCookie(response);
  }
}

function isBuddyResubmissionRequest(value: unknown): value is BuddyResubmissionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Partial<BuddyResubmissionRequest>;
  const displayName = typeof request.displayName === "string" ? request.displayName : "";
  const contactIdentifier =
    typeof request.contactIdentifier === "string" ? request.contactIdentifier : "";

  return (
    displayName.length >= 2 &&
    displayName.length <= 30 &&
    displayName.trim() === displayName &&
    (request.profileImageKey === null ||
      (typeof request.profileImageKey === "string" &&
        request.profileImageKey.length <= 500 &&
        PROFILE_IMAGE_KEY_PATTERN.test(request.profileImageKey))) &&
    typeof request.nationalityCode === "string" &&
    /^[A-Z]{2}$/.test(request.nationalityCode) &&
    typeof request.birthDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(request.birthDate) &&
    typeof request.contactMethod === "string" &&
    CONTACT_METHODS.has(request.contactMethod as ContactMethod) &&
    typeof request.contactCountryCode === "string" &&
    CONTACT_COUNTRY_CODE_PATTERN.test(request.contactCountryCode) &&
    CONTACT_IDENTIFIER_PATTERN.test(contactIdentifier)
  );
}
