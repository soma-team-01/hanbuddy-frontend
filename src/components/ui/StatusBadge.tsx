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

const STYLES: Record<ApplicationStatus, { className: string; Icon: typeof ClockIcon }> = {
  pending_payment: {
    className: "bg-warning-soft text-warning",
    Icon: ClockIcon,
  },
  confirmed: {
    className: "bg-success-soft text-success",
    Icon: CheckCircleIcon,
  },
  cancelled: {
    className: "bg-danger/10 text-danger",
    Icon: ClockIcon,
  },
  completed: {
    className: "bg-panel-raised text-muted",
    Icon: CheckCircleIcon,
  },
};

export function StatusBadge({ status }: Readonly<{ status: ApplicationStatus }>) {
  const t = useTranslations("Status");
  const { className, Icon } = STYLES[status];
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-semibold ${className}`}
    >
      <Icon className="size-3.5" />
      {t(STATUS_KEYS[status])}
    </span>
  );
}
