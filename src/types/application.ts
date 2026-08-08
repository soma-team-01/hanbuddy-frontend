export type ApplicationStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";
export type BackendApplicationStatus =
  "PENDING_PAYMENT" | "SUPERSEDED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type ApplicationCancellationReason =
  "SCHEDULE_CONFLICT" | "ILLNESS" | "FOUND_OTHER" | "OTHER";

export interface PriceBreakdown {
  unitPrice: number;
  guests: number;
  serviceFee: number;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  dateLabel: string;
  hostName: string;
  hostAvatarUrl: string | null;
  activityTitle: string;
  breakdown?: PriceBreakdown;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
}

export interface CreateApplicationRequest {
  activityScheduleId: number;
  guestCount: number;
  specialRequest?: string;
}

export interface CancelApplicationRequest {
  cancellationReason: ApplicationCancellationReason;
}

export type PaymentStatus =
  "CREATED" | "CONFIRMED" | "REVIEW_REQUIRED" | "FAILED" | "CANCELLED" | "EXPIRED";

/** 토스 successUrl 쿼리 파라미터를 그대로 전달하는 결제 승인 요청 */
export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  /** KRW 정수 금액 — 결제창 요청 금액과 같아야 한다 */
  amount: number;
}

export interface ApplicationResponse {
  applicationId: number;
  activityId: number;
  activityScheduleId: number;
  activityTitle: string;
  thumbnailImageUrl: string | null;
  buddyName: string;
  guestCount: number;
  specialRequest: string | null;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  startAt: string;
  price: number;
  totalPrice: number;
  currency: string;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
  status: BackendApplicationStatus;
  cancellationReason: ApplicationCancellationReason | null;
  cancellationDetail: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface PaymentReadyResponse {
  application: ApplicationResponse;
  paymentId: number;
  /** 토스 결제창 requestPayment의 orderId로 전달할 주문번호 */
  orderNumber: string;
  /** 토스 결제창 SDK 초기화에 사용할 클라이언트 키 */
  clientKey: string;
  /** 토스 결제창에 표시할 주문명(활동 제목) */
  orderName: string;
  paymentStatus: PaymentStatus;
  /** 결제 금액 (KRW 정수) — 결제창 요청·승인 금액과 같아야 한다 */
  paymentAmount: number;
  paymentCurrency: string;
  /** 현재 주문번호를 재사용할 수 있는 백엔드 기준 만료 시각 (Asia/Seoul 오프셋 포함) */
  orderExpiresAt: string;
}
