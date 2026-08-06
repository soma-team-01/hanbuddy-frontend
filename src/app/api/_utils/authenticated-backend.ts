import { NextRequest, NextResponse } from "next/server";
import {
  appendBackendSetCookies,
  createProxyErrorResponse,
  deleteBackend,
  getBackend,
  patchBackend,
  postBackend,
  type BackendResponse,
} from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { MyProfile } from "@/types/user";

export function getAccessToken(request: NextRequest) {
  return request.cookies.get(AUTH_COOKIES.accessToken)?.value;
}

export function unauthorizedResponse() {
  return NextResponse.json(createProxyErrorResponse("로그인이 필요합니다."), { status: 401 });
}

export function forbiddenResponse(message = "관리자 권한이 필요합니다.") {
  return NextResponse.json(createProxyErrorResponse(message), { status: 403 });
}

export async function requireAdmin(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  try {
    const backend = await getBackend<MyProfile>("/users/me", { bearerToken: accessToken });
    if (!backend.payload.isSuccess || backend.status < 200 || backend.status >= 300) {
      return createBackendJsonResponse(backend);
    }

    return backend.payload.result.userType === "ADMIN" ? null : forbiddenResponse();
  } catch (error) {
    console.error("관리자 권한을 확인하지 못했습니다.", error);
    return backendUnavailableResponse("관리자 권한을 확인하지 못했습니다.");
  }
}

export function badRequestResponse(message: string) {
  return NextResponse.json(createProxyErrorResponse(message), { status: 400 });
}

export function backendUnavailableResponse(message: string) {
  return NextResponse.json(createProxyErrorResponse(message), { status: 502 });
}

export function createBackendJsonResponse<TResult>(backend: BackendResponse<TResult>) {
  const response = NextResponse.json(backend.payload, { status: backend.status });
  appendBackendSetCookies(response, backend.setCookies);
  return response;
}

async function proxyAuthenticated<TResult>(
  request: NextRequest,
  unavailableMessage: string,
  callBackend: (accessToken: string) => Promise<BackendResponse<TResult>>,
) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  try {
    const backend = await callBackend(accessToken);
    return createBackendJsonResponse(backend);
  } catch (error) {
    console.error(unavailableMessage, error);
    return backendUnavailableResponse(unavailableMessage);
  }
}

export async function proxyAuthenticatedGet<TResult>(
  request: NextRequest,
  backendPath: string,
  unavailableMessage: string,
) {
  return proxyAuthenticated<TResult>(request, unavailableMessage, (accessToken) =>
    getBackend<TResult>(backendPath, { bearerToken: accessToken }),
  );
}

export async function proxyPublicGet<TResult>(
  _request: NextRequest,
  backendPath: string,
  unavailableMessage: string,
) {
  try {
    const backend = await getBackend<TResult>(backendPath);
    return createBackendJsonResponse(backend);
  } catch (error) {
    console.error(unavailableMessage, error);
    return backendUnavailableResponse(unavailableMessage);
  }
}

export async function readJsonBody<TBody>(request: NextRequest, invalidMessage: string) {
  try {
    return { ok: true as const, body: (await request.json()) as TBody };
  } catch {
    return { ok: false as const, response: badRequestResponse(invalidMessage) };
  }
}

export async function proxyAuthenticatedPost<TBody, TResult>(
  request: NextRequest,
  backendPath: string,
  body: TBody,
  unavailableMessage: string,
) {
  return proxyAuthenticated<TResult>(request, unavailableMessage, (accessToken) =>
    postBackend<TBody, TResult>(backendPath, body, {
      bearerToken: accessToken,
    }),
  );
}

export async function proxyAuthenticatedPatch<TBody, TResult>(
  request: NextRequest,
  backendPath: string,
  body: TBody,
  unavailableMessage: string,
) {
  return proxyAuthenticated<TResult>(request, unavailableMessage, (accessToken) =>
    patchBackend<TBody, TResult>(backendPath, body, {
      bearerToken: accessToken,
    }),
  );
}

export async function proxyAuthenticatedDelete<TResult>(
  request: NextRequest,
  backendPath: string,
  unavailableMessage: string,
) {
  return proxyAuthenticated<TResult>(request, unavailableMessage, (accessToken) =>
    deleteBackend<TResult>(backendPath, { bearerToken: accessToken }),
  );
}
