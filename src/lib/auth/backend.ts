import type { NextResponse } from "next/server";
import type { ApiResponse, ErrorApiResponse } from "./types";

const DEFAULT_API_BASE_URL = "http://43.200.28.162/api/v1";

interface BackendPostOptions {
  bearerToken?: string;
  cookieHeader?: string | null;
}

export interface BackendResponse<T> {
  status: number;
  payload: ApiResponse<T> | ErrorApiResponse;
  setCookies: string[];
}

export function getBackendApiBaseUrl() {
  return (process.env.HANBUDDY_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function postBackend<TBody, TResult>(
  path: string,
  body?: TBody,
  options: BackendPostOptions = {},
): Promise<BackendResponse<TResult>> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.bearerToken) headers.set("Authorization", `Bearer ${options.bearerToken}`);
  if (options.cookieHeader) headers.set("Cookie", options.cookieHeader);

  const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

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

function getSetCookieHeaders(headers: Headers) {
  const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  if (!setCookie) return [];
  return setCookie.split(/,(?=\s*[^;,]+=)/).map((cookie) => cookie.trim());
}
