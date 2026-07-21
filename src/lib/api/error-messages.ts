import { ApiClientError } from "./errors";

export const BACKEND_ERROR_CODES = [
  "ACTIVITY400_CURRENCY",
  "ACTIVITY403_OWNER",
  "ACTIVITY404",
  "ACTIVITY_SCHEDULE400_START_AT",
  "ACTIVITY_SCHEDULE404",
  "APPLICATION400_ACTIVITY_NOT_APPLICABLE",
  "APPLICATION400_CAPACITY_EXCEEDED",
  "APPLICATION400_NOT_CANCELLABLE",
  "APPLICATION400_SCHEDULE_NOT_OPEN",
  "APPLICATION403_OWNER",
  "APPLICATION404",
  "AUTH401",
  "AUTH409",
  "COMMON401",
  "IMAGE400_CONTENT_TYPE",
  "IMAGE400_COUNT",
  "PAYMENT400_ORDER",
  "PAYMENT400_STATE",
  "PAYMENT404",
  "PAYMENT409_CAPTURE_MISMATCH",
  "PAYMENT409_REVIEW_REQUIRED",
  "PAYMENT502_AUTH",
  "PAYMENT502_CAPTURE",
  "PAYMENT502_ORDER_CREATE",
  "PAYMENT502_ORDER_LOOKUP",
  "PAYMENT503_EXCHANGE_RATE",
  "TOKEN401",
  "TOKEN401_REFRESH",
  "USER403_BUDDY",
  "USER403_TOURIST",
  "USER404",
  "USER500_BUDDY_PROFILE",
  "VALIDATION400_FORMAT",
  "VALIDATION400_INVALID",
  "VALIDATION400_RANGE",
  "VALIDATION400_REQUIRED",
] as const;

export type KnownBackendErrorCode = (typeof BACKEND_ERROR_CODES)[number];

export const API_ERROR_MESSAGE_KEYS = [
  "authenticationRequired",
  "googleAuthenticationInvalid",
  "emailAlreadyRegistered",
  "validationRequired",
  "validationFormat",
  "validationRange",
  "validationInvalid",
  "imageContentType",
  "imageCount",
  "activityCurrency",
  "activityScheduleFuture",
  "activityOwner",
  "activityNotFound",
  "activityScheduleNotFound",
  "applicationNotApplicable",
  "applicationScheduleNotOpen",
  "applicationCapacityExceeded",
  "applicationNotCancellable",
  "applicationOwner",
  "applicationNotFound",
  "paymentOrderMismatch",
  "paymentState",
  "paymentNotFound",
  "paymentReviewRequired",
  "paymentCaptureMismatch",
  "paymentServiceUnavailable",
  "exchangeRateUnavailable",
  "buddyRequired",
  "touristRequired",
  "userNotFound",
  "buddyProfileInvalid",
  "permissionDenied",
  "resourceNotFound",
  "conflict",
  "serverUnavailable",
] as const;

export type ApiErrorMessageKey = (typeof API_ERROR_MESSAGE_KEYS)[number];

export const ERROR_CODE_MESSAGE_KEYS = {
  ACTIVITY400_CURRENCY: "activityCurrency",
  ACTIVITY403_OWNER: "activityOwner",
  ACTIVITY404: "activityNotFound",
  ACTIVITY_SCHEDULE400_START_AT: "activityScheduleFuture",
  ACTIVITY_SCHEDULE404: "activityScheduleNotFound",
  APPLICATION400_ACTIVITY_NOT_APPLICABLE: "applicationNotApplicable",
  APPLICATION400_CAPACITY_EXCEEDED: "applicationCapacityExceeded",
  APPLICATION400_NOT_CANCELLABLE: "applicationNotCancellable",
  APPLICATION400_SCHEDULE_NOT_OPEN: "applicationScheduleNotOpen",
  APPLICATION403_OWNER: "applicationOwner",
  APPLICATION404: "applicationNotFound",
  AUTH401: "googleAuthenticationInvalid",
  AUTH409: "emailAlreadyRegistered",
  COMMON401: "authenticationRequired",
  IMAGE400_CONTENT_TYPE: "imageContentType",
  IMAGE400_COUNT: "imageCount",
  PAYMENT400_ORDER: "paymentOrderMismatch",
  PAYMENT400_STATE: "paymentState",
  PAYMENT404: "paymentNotFound",
  PAYMENT409_CAPTURE_MISMATCH: "paymentCaptureMismatch",
  PAYMENT409_REVIEW_REQUIRED: "paymentReviewRequired",
  PAYMENT502_AUTH: "paymentServiceUnavailable",
  PAYMENT502_CAPTURE: "paymentServiceUnavailable",
  PAYMENT502_ORDER_CREATE: "paymentServiceUnavailable",
  PAYMENT502_ORDER_LOOKUP: "paymentServiceUnavailable",
  PAYMENT503_EXCHANGE_RATE: "exchangeRateUnavailable",
  TOKEN401: "authenticationRequired",
  TOKEN401_REFRESH: "authenticationRequired",
  USER403_BUDDY: "buddyRequired",
  USER403_TOURIST: "touristRequired",
  USER404: "userNotFound",
  USER500_BUDDY_PROFILE: "buddyProfileInvalid",
  VALIDATION400_FORMAT: "validationFormat",
  VALIDATION400_INVALID: "validationInvalid",
  VALIDATION400_RANGE: "validationRange",
  VALIDATION400_REQUIRED: "validationRequired",
} satisfies Record<KnownBackendErrorCode, ApiErrorMessageKey>;

function isKnownBackendErrorCode(code: string): code is KnownBackendErrorCode {
  return BACKEND_ERROR_CODES.includes(code as KnownBackendErrorCode);
}

export function resolveApiErrorMessageKey(error: unknown): ApiErrorMessageKey | null {
  if (!(error instanceof ApiClientError)) return null;
  if (error.code && isKnownBackendErrorCode(error.code)) {
    return ERROR_CODE_MESSAGE_KEYS[error.code];
  }
  if (error.code === "AUTH_PROXY_ERROR") return "serverUnavailable";
  if (error.status === 401) return "authenticationRequired";
  if (error.status === 403) return "permissionDenied";
  if (error.status === 404) return "resourceNotFound";
  if (error.status === 409) return "conflict";
  if (error.status !== null && error.status >= 500) return "serverUnavailable";
  return null;
}
