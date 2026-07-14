import type {
  ApplicationCancellationReason,
  ApplicationResponse,
  CreateApplicationRequest,
  PaymentReadyResponse,
} from "@/types/application";
import { requestApiResult, type ApiResult } from "./result";

export type ApplicationResult = ApiResult<ApplicationResponse, "application">;
export type ApplicationsResult = ApiResult<ApplicationResponse[], "applications">;
export type PaymentReadyResult = ApiResult<PaymentReadyResponse, "payment">;

const DEFAULT_APPLICATION_CREATE_ERROR_MESSAGE = "신청을 완료하지 못했습니다.";
const DEFAULT_APPLICATION_LIST_ERROR_MESSAGE = "신청 목록을 불러오지 못했습니다.";
const DEFAULT_APPLICATION_CANCEL_ERROR_MESSAGE = "신청을 취소하지 못했습니다.";
const DEFAULT_PAYMENT_CONTINUE_ERROR_MESSAGE = "결제를 이어가지 못했습니다.";
const DEFAULT_PAYMENT_CAPTURE_ERROR_MESSAGE = "결제를 완료하지 못했습니다.";

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

export async function captureApplicationPayment(
  applicationId: number | string,
  paypalOrderId: string,
): Promise<ApplicationResult> {
  return requestApiResult<ApplicationResponse, "application">(
    `/api/applications/me/${applicationId}/payment/capture`,
    "application",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId }),
    },
    DEFAULT_PAYMENT_CAPTURE_ERROR_MESSAGE,
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
): Promise<ApplicationResult> {
  return requestApiResult<ApplicationResponse, "application">(
    `/api/applications/me/${applicationId}/cancel`,
    "application",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellationReason }),
    },
    DEFAULT_APPLICATION_CANCEL_ERROR_MESSAGE,
  );
}
