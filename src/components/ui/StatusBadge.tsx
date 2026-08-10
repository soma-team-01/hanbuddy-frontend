import { useTranslations } from "next-intl";
import { CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import type { ApplicationStatus } from "@/types/application";

const STATUS_KEYS = {
  pending_payment: "pendingPayment",
  confirmed: "confirmed",
  cancelled: "cancelled",
  completed: "completed",
} as const satisfies Record<
  ApplicationStatus,
  "pendingPayment" | "confirmed" | "cancelled" | "completed"
>;

// 배경도 테두리도 채우지 않고 글씨 색으로만 상태를 구분한다
const STYLES: Record<ApplicationStatus, { className: string; Icon: typeof ClockIcon }> = {
  pending_payment: {
    className: "text-warning",
    Icon: ClockIcon,
  },
  confirmed: {
    className: "text-success",
    Icon: CheckCircleIcon,
  },
  cancelled: {
    className: "text-danger",
    Icon: ClockIcon,
  },
  completed: {
    className: "text-muted",
    Icon: CheckCircleIcon,
  },
};

export function StatusBadge({ status }: Readonly<{ status: ApplicationStatus }>) {
  const t = useTranslations("Status");
  const { className, Icon } = STYLES[status];
  return (
    <span className={`flex items-center gap-1.5 font-display text-xs font-bold ${className}`}>
      <Icon className="size-3.5" />
      {t(STATUS_KEYS[status])}
    </span>
  );
}
