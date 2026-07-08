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
}

export interface CreateApplicationRequest {
  activityScheduleId: number;
  guestCount: number;
  specialRequest?: string;
}

export interface CancelApplicationRequest {
  cancellationReason: ApplicationCancellationReason;
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
  activityDate: string;
  startTime: string;
  price: number;
  totalPrice: number;
  currency: string;
  status: BackendApplicationStatus;
  cancellationReason: ApplicationCancellationReason | null;
  cancellationDetail: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
