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

type QueryResult =
  | { status: "success" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

type SuccessResult<TResult> = Extract<TResult, { status: "success" }>;

export function unwrapApiResult<
  TResult extends QueryResult,
  TKey extends Exclude<keyof SuccessResult<TResult>, "status">,
>(result: TResult, key: TKey): SuccessResult<TResult>[TKey] {
  if (result.status === "unauthenticated") {
    throw new UnauthenticatedQueryError();
  }
  if (result.status === "error") {
    throw new ApiQueryError(result.message);
  }
  return (result as SuccessResult<TResult>)[key];
}
