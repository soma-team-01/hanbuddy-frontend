"use client";

import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateTime } from "@/lib/datetime";
import type { ApplicationConflictItemResponse, ApplicationConflictType } from "@/types/application";

const COPY_KEY_BY_TYPE = {
  SAME_SCHEDULE: {
    title: "sameScheduleTitle",
    description: "sameScheduleDescription",
  },
  TIME_OVERLAP: {
    title: "timeConflictTitle",
    description: "timeConflictDescription",
  },
  SAME_ACTIVITY_SAME_DAY: {
    title: "sameActivitySameDayTitle",
    description: "sameActivitySameDayDescription",
  },
  OTHER_ACTIVITY_SAME_DAY: {
    title: "otherActivitySameDayTitle",
    description: "otherActivitySameDayDescription",
  },
} as const;

export function BookingConflictDialog({
  type,
  item,
  blocking,
  onContinue,
  onClose,
}: Readonly<{
  type: ApplicationConflictType;
  item?: ApplicationConflictItemResponse;
  blocking: boolean;
  onContinue: () => void;
  onClose: () => void;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Booking");
  const copy = COPY_KEY_BY_TYPE[type];
  const existingDateTime = item ? formatSeoulDateTime(item.startAt, locale) : null;

  return (
    <ConfirmDialog
      title={t(copy.title)}
      description={t(copy.description)}
      onClose={onClose}
      confirmSlot={
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link
            href="/applications"
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-line-strong bg-panel px-4 font-display text-sm font-semibold text-ink transition-colors hover:bg-panel-raised"
          >
            {t("viewExistingSchedule")}
          </Link>
          {!blocking ? (
            <button
              type="button"
              onClick={onContinue}
              className="h-12 flex-1 rounded-xl bg-primary px-4 font-display text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              {t("continueApplication")}
            </button>
          ) : null}
        </div>
      }
    >
      {item && existingDateTime ? (
        <p className="rounded-xl border border-line-soft bg-panel px-4 py-3 text-sm text-ink">
          {t("existingSchedule", {
            title: item.activityTitle,
            dateTime: existingDateTime,
          })}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
