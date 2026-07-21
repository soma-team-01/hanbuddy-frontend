import { type ApiClientError, UnauthenticatedQueryError } from "@/lib/api/errors";

export { UnauthenticatedQueryError } from "@/lib/api/errors";

type QueryResult =
  | { status: "success" }
  | { status: "unauthenticated" }
  | { status: "error"; error: ApiClientError };

type SuccessResult<TResult> = Extract<TResult, { status: "success" }>;

export function unwrapApiResult<
  TResult extends QueryResult,
  TKey extends Exclude<keyof SuccessResult<TResult>, "status">,
>(result: TResult, key: TKey): SuccessResult<TResult>[TKey] {
  if (result.status === "unauthenticated") {
    throw new UnauthenticatedQueryError();
  }
  if (result.status === "error") {
    throw result.error;
  }
  return (result as SuccessResult<TResult>)[key];
}
