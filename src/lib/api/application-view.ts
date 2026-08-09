import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday, formatSeoulTime } from "@/lib/datetime";
import type {
  Application,
  ApplicationResponse,
  ApplicationStatus,
  BackendApplicationStatus,
} from "@/types/application";

const STATUS_BY_BACKEND_STATUS: Record<BackendApplicationStatus, ApplicationStatus> = {
  PENDING_PAYMENT: "pending_payment",
  // 새 신청으로 대체된 신청은 목록에서 걸러지지만, 방어적으로 취소와 동일하게 취급한다
  SUPERSEDED: "cancelled",
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
  const dateWithWeekday = formatSeoulDateWithWeekday(response.startAt, locale);
  const time = formatSeoulTime(response.startAt, locale);
  return {
    id: String(response.applicationId),
    activityId: response.activityId,
    status: STATUS_BY_BACKEND_STATUS[response.status],
    startAt: response.startAt,
    dateLabel: dateWithWeekday && time ? `${dateWithWeekday} · ${time}` : dateTimeUnavailable,
    hostName: response.buddyName,
    hostAvatarUrl: null,
    activityTitle: response.activityTitle,
    thumbnailUrl: response.thumbnailImageUrl,
    cancellationReason: response.cancellationReason,
    breakdown: {
      unitPrice: response.price,
      guests: response.guestCount,
      serviceFee: Math.max(0, response.totalPrice - subtotal),
    },
    paymentAmount: response.paymentAmount,
    paymentCurrency: response.paymentCurrency,
  };
}
