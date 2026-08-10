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

// 배경을 채우지 않고 테두리와 글씨 색으로만 상태를 구분한다.
// 결제 대기는 사용자가 뭔가 해야 하는 상태라 브랜드 색으로 시선을 끈다.
const STYLES: Record<ApplicationStatus, { className: string; Icon: typeof ClockIcon }> = {
  pending_payment: {
    className: "border-primary/40 text-primary",
    Icon: ClockIcon,
  },
  confirmed: {
    className: "border-success/40 text-success",
    Icon: CheckCircleIcon,
  },
  cancelled: {
    className: "border-line-strong text-muted",
    Icon: ClockIcon,
  },
  completed: {
    className: "border-line-strong text-muted",
    Icon: CheckCircleIcon,
  },
};

export function StatusBadge({ status }: Readonly<{ status: ApplicationStatus }>) {
  const t = useTranslations("Status");
  const { className, Icon } = STYLES[status];
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-semibold ${className}`}
    >
      <Icon className="size-3.5" />
      {t(STATUS_KEYS[status])}
    </span>
  );
}
