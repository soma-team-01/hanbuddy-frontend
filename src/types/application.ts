export type ApplicationStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";
export type BackendApplicationStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
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
  "CREATED" | "CAPTURED" | "REVIEW_REQUIRED" | "FAILED" | "CANCELLED" | "EXPIRED";

export interface CapturePaymentRequest {
  paypalOrderId: string;
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
  paypalOrderId: string;
  approvalUrl: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  paymentCurrency: string;
  /** 현재 PayPal order를 재사용할 수 있는 백엔드 기준 만료 시각 (Asia/Seoul 오프셋 포함) */
  orderExpiresAt: string;
}
