import { CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import type { ApplicationStatus } from "@/types/application";

const STYLES: Record<
  ApplicationStatus,
  { label: string; className: string; Icon: typeof ClockIcon }
> = {
  pending_payment: {
    label: "Pending Payment",
    className: "bg-warning-soft text-warning",
    Icon: ClockIcon,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-success-soft text-success",
    Icon: CheckCircleIcon,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-danger/10 text-danger",
    Icon: ClockIcon,
  },
  completed: {
    label: "Completed",
    className: "bg-line text-ink-soft",
    Icon: CheckCircleIcon,
  },
};

export function StatusBadge({ status }: Readonly<{ status: ApplicationStatus }>) {
  const { label, className, Icon } = STYLES[status];
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-semibold ${className}`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
