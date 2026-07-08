import type { ApiResponse, ErrorApiResponse } from "@/lib/auth/types";
import { fetchWithAuthRetry } from "./client";

export type ApiResult<T, TKey extends string> =
  | ({ status: "success" } & Record<TKey, T>)
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export async function requestApiResult<T, TKey extends string>(
  path: string,
  key: TKey,
  init: RequestInit | undefined,
  defaultErrorMessage: string,
): Promise<ApiResult<T, TKey>> {
  let response: Response;
  try {
    response = await fetchWithAuthRetry(path, init);
  } catch {
    return { status: "error", message: defaultErrorMessage };
  }

  if (response.status === 401) return { status: "unauthenticated" };

  const payload = (await response.json().catch(() => null)) as
    ApiResponse<T> | ErrorApiResponse | null;
  if (!payload?.isSuccess) {
    return { status: "error", message: payload?.message ?? defaultErrorMessage };
  }

  return { status: "success", [key]: payload.result } as ApiResult<T, TKey>;
}
