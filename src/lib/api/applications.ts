import type {
  ApplicationCancellationReason,
  ApplicationConflictCheckResponse,
  ApplicationResponse,
  CancelApplicationRequest,
  ConfirmPaymentRequest,
  CreateApplicationRequest,
  PaymentReadyResponse,
} from "@/types/application";
import { requestApiResult, type ApiResult } from "./result";

export type ApplicationResult = ApiResult<ApplicationResponse, "application">;
export type ApplicationsResult = ApiResult<ApplicationResponse[], "applications">;
export type PaymentReadyResult = ApiResult<PaymentReadyResponse, "payment">;
export type ApplicationConflictResult = ApiResult<ApplicationConflictCheckResponse, "conflicts">;

const DEFAULT_APPLICATION_CREATE_ERROR_MESSAGE = "신청을 완료하지 못했습니다.";
const DEFAULT_APPLICATION_LIST_ERROR_MESSAGE = "신청 목록을 불러오지 못했습니다.";
const DEFAULT_APPLICATION_CANCEL_ERROR_MESSAGE = "신청을 취소하지 못했습니다.";
const DEFAULT_PAYMENT_CANCEL_ERROR_MESSAGE = "신청을 취소하지 못했습니다.";
const DEFAULT_PAYMENT_CONTINUE_ERROR_MESSAGE = "결제를 이어가지 못했습니다.";
const DEFAULT_PAYMENT_CONFIRM_ERROR_MESSAGE = "결제를 완료하지 못했습니다.";
const DEFAULT_APPLICATION_CONFLICT_ERROR_MESSAGE = "예약 일정 중복 여부를 확인하지 못했습니다.";

export async function getApplicationConflicts(
  activityScheduleId: number | string,
): Promise<ApplicationConflictResult> {
  return requestApiResult<ApplicationConflictCheckResponse, "conflicts">(
    `/api/applications/conflicts?activityScheduleId=${encodeURIComponent(activityScheduleId)}`,
    "conflicts",
    undefined,
    DEFAULT_APPLICATION_CONFLICT_ERROR_MESSAGE,
  );
}

export async function createApplication(
  request: CreateApplicationRequest,
): Promise<PaymentReadyResult> {
  return requestApiResult<PaymentReadyResponse, "payment">(
    "/api/applications",
    "payment",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_APPLICATION_CREATE_ERROR_MESSAGE,
  );
}

export async function continueApplicationPayment(
  applicationId: number | string,
): Promise<PaymentReadyResult> {
  return requestApiResult<PaymentReadyResponse, "payment">(
    `/api/applications/me/${applicationId}/payment/continue`,
    "payment",
    { method: "POST" },
    DEFAULT_PAYMENT_CONTINUE_ERROR_MESSAGE,
  );
}

export async function confirmApplicationPayment(
  applicationId: number | string,
  request: ConfirmPaymentRequest,
): Promise<ApplicationResult> {
  return requestApiResult<ApplicationResponse, "application">(
    `/api/applications/me/${applicationId}/payment/confirm`,
    "application",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_PAYMENT_CONFIRM_ERROR_MESSAGE,
  );
}

/** 결제 전 신청을 취소한다. 좌석 선점과 결제 주문이 함께 해제된다. */
export async function cancelPendingPayment(
  applicationId: number | string,
): Promise<ApplicationResult> {
  return requestApiResult<ApplicationResponse, "application">(
    `/api/applications/me/${applicationId}/payment/cancel`,
    "application",
    { method: "PATCH" },
    DEFAULT_PAYMENT_CANCEL_ERROR_MESSAGE,
  );
}

export async function getMyApplications(): Promise<ApplicationsResult> {
  return requestApiResult<ApplicationResponse[], "applications">(
    "/api/applications/me",
    "applications",
    undefined,
    DEFAULT_APPLICATION_LIST_ERROR_MESSAGE,
  );
}

export async function cancelMyApplication(
  applicationId: number | string,
  cancellationReason: ApplicationCancellationReason,
  /** OTHER 사유의 상세 설명. 다른 사유에 붙이면 백엔드가 거절하므로 그때는 넘기지 않는다 */
  cancellationDetail?: string,
): Promise<ApplicationResult> {
  const detail = cancellationDetail?.trim();
  const body: CancelApplicationRequest =
    cancellationReason === "OTHER" && detail
      ? { cancellationReason, cancellationDetail: detail }
      : { cancellationReason };

  return requestApiResult<ApplicationResponse, "application">(
    `/api/applications/me/${applicationId}/cancel`,
    "application",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    DEFAULT_APPLICATION_CANCEL_ERROR_MESSAGE,
  );
}
