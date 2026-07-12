import type { ApiResult } from "@/lib/api/result";

export class ApiQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiQueryError";
  }
}

export class UnauthenticatedQueryError extends Error {
  constructor() {
    super("로그인이 필요합니다.");
    this.name = "UnauthenticatedQueryError";
  }
}

export function unwrapApiResult<T, TKey extends string>(
  result: ApiResult<T, TKey>,
  key: TKey,
): T {
  if (result.status === "unauthenticated") {
    throw new UnauthenticatedQueryError();
  }
  if (result.status === "error") {
    throw new ApiQueryError(result.message);
  }
  return result[key];
}
