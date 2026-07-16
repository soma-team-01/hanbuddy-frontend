import type { Locale } from "@/i18n/routing";
import { formatSeoulDateTime } from "@/lib/datetime";
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

export function mapApplicationResponseToApplication(
  response: ApplicationResponse,
  dateTimeUnavailable: string,
  locale: Locale = "en",
): Application {
  const subtotal = response.price * response.guestCount;
  return {
    id: String(response.applicationId),
    status: STATUS_BY_BACKEND_STATUS[response.status],
    dateLabel: formatSeoulDateTime(response.startAt, locale) ?? dateTimeUnavailable,
    hostName: response.buddyName,
    hostAvatarUrl: null,
    activityTitle: response.activityTitle,
    breakdown: {
      unitPrice: response.price,
      guests: response.guestCount,
      serviceFee: Math.max(0, response.totalPrice - subtotal),
    },
    paymentAmount: response.paymentAmount,
    paymentCurrency: response.paymentCurrency,
  };
}
