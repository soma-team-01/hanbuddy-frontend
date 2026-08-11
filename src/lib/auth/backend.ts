import type { NextResponse } from "next/server";
import type { ApiResponse, ErrorApiResponse } from "./types";

export const BACKEND_REQUEST_TIMEOUT_MS = 10_000;

interface BackendRequestOptions {
  bearerToken?: string;
  cookieHeader?: string | null;
}

export interface BackendResponse<T> {
  status: number;
  payload: ApiResponse<T> | ErrorApiResponse;
  setCookies: string[];
}

export function getBackendApiBaseUrl() {
  return getRequiredServerEnv("HANBUDDY_API_BASE_URL").replace(/\/$/, "");
}

export function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function postBackend<TBody, TResult>(
  path: string,
  body?: TBody,
  options: BackendRequestOptions = {},
): Promise<BackendResponse<TResult>> {
  return requestBackend("POST", path, body, options);
}

export async function getBackend<TResult>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<BackendResponse<TResult>> {
  return requestBackend("GET", path, undefined, options);
}

export async function patchBackend<TBody, TResult>(
  path: string,
  body?: TBody,
  options: BackendRequestOptions = {},
): Promise<BackendResponse<TResult>> {
  return requestBackend("PATCH", path, body, options);
}

export async function deleteBackend<TResult>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<BackendResponse<TResult>> {
  return requestBackend("DELETE", path, undefined, options);
}

async function requestBackend<TBody, TResult>(
  method: "DELETE" | "GET" | "POST" | "PATCH",
  path: string,
  body?: TBody,
  options: BackendRequestOptions = {},
): Promise<BackendResponse<TResult>> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.bearerToken) headers.set("Authorization", `Bearer ${options.bearerToken}`);
  if (options.cookieHeader) headers.set("Cookie", options.cookieHeader);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      return {
        status: 504,
        payload: createProxyErrorResponse("인증 서버 응답이 지연되고 있습니다."),
        setCookies: [],
      };
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => ({
    isSuccess: false,
    code: "AUTH_PROXY_ERROR",
    message: "인증 서버 응답을 읽을 수 없습니다.",
  }))) as ApiResponse<TResult> | ErrorApiResponse;

  return {
    status: response.status,
    payload,
    setCookies: getSetCookieHeaders(response.headers),
  };
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

export function appendBackendSetCookies(response: NextResponse, setCookies: readonly string[]) {
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
}

export function createProxyErrorResponse(message: string): ErrorApiResponse {
  return {
    isSuccess: false,
    code: "AUTH_PROXY_ERROR",
    message,
  };
}

export function getSetCookieHeaders(headers: Headers) {
  const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie().flatMap(splitCombinedSetCookieHeader);
  }

  const setCookie = headers.get("set-cookie");
  if (!setCookie) return [];
  return splitCombinedSetCookieHeader(setCookie);
}

function splitCombinedSetCookieHeader(header: string) {
  const cookies: string[] = [];
  let cookieStart = 0;
  let index = 0;

  while (index < header.length) {
    if (header[index] === "," && startsCookiePair(header, index + 1)) {
      cookies.push(header.slice(cookieStart, index).trim());
      cookieStart = index + 1;
    }
    index += 1;
  }

  cookies.push(header.slice(cookieStart).trim());
  return cookies.filter(Boolean);
}

function startsCookiePair(header: string, startIndex: number) {
  let index = startIndex;
  while (header[index] === " " || header[index] === "\t") {
    index += 1;
  }

  const nameStart = index;
  while (index < header.length) {
    const char = header[index];
    if (char === "=") return index > nameStart;
    if (char === "," || char === ";" || char === " " || char === "\t") return false;
    index += 1;
  }

  return false;
}
