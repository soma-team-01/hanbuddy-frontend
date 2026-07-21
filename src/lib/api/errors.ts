import type { ErrorApiResponse } from "@/lib/auth/types";

export interface ApiClientErrorInit {
  code: string | null;
  status: number | null;
  details: unknown;
  backendMessage: string | null;
  fallbackMessage?: string;
}

export class ApiClientError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  readonly details: unknown;
  readonly backendMessage: string | null;

  constructor({ code, status, details, backendMessage, fallbackMessage }: ApiClientErrorInit) {
    super(backendMessage ?? fallbackMessage ?? "API request failed");
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.backendMessage = backendMessage;
  }
}

export class UnauthenticatedQueryError extends Error {
  constructor() {
    super("로그인이 필요합니다.");
    this.name = "UnauthenticatedQueryError";
  }
}

export function createApiClientError(
  status: number | null,
  payload: ErrorApiResponse | null | undefined,
  fallbackMessage?: string,
) {
  return new ApiClientError({
    code: payload?.code ?? null,
    status,
    details: payload?.result ?? null,
    backendMessage: payload?.message ?? null,
    fallbackMessage,
  });
}

export function toApiClientError(error: unknown, fallbackMessage?: string) {
  return error instanceof ApiClientError
    ? error
    : new ApiClientError({
        code: null,
        status: null,
        details: null,
        backendMessage: null,
        fallbackMessage,
      });
}

export function isUnauthenticatedError(error: unknown) {
  return (
    error instanceof UnauthenticatedQueryError ||
    (error instanceof ApiClientError && error.status === 401)
  );
}
