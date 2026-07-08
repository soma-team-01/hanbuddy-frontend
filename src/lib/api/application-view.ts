import type {
  Application,
  ApplicationResponse,
  ApplicationStatus,
  BackendApplicationStatus,
} from "@/types/application";

const STATUS_BY_BACKEND_STATUS: Record<BackendApplicationStatus, ApplicationStatus> = {
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

export function mapApplicationResponseToApplication(response: ApplicationResponse): Application {
  const subtotal = response.price * response.guestCount;
  return {
    id: String(response.applicationId),
    status: STATUS_BY_BACKEND_STATUS[response.status],
    dateLabel: `${response.activityDate} ${response.startTime}`,
    hostName: response.buddyName,
    hostAvatarUrl: null,
    activityTitle: response.activityTitle,
    breakdown: {
      unitPrice: response.price,
      guests: response.guestCount,
      serviceFee: Math.max(0, response.totalPrice - subtotal),
    },
  };
}
