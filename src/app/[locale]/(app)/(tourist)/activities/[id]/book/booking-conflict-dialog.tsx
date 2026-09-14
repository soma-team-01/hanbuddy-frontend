"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClockIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { getContentLanguage } from "@/lib/content-language";
import {
  formatSeoulDateTime,
  formatSeoulDateWithWeekday,
  formatSeoulTime,
  getSeoulDateTimeParts,
} from "@/lib/datetime";
import { myApplicationsQueryOptions } from "@/lib/query/applications";
import type { ApplicationConflictItemResponse, ApplicationConflictType } from "@/types/application";

const TITLE_KEY_BY_TYPE = {
  SAME_SCHEDULE: "sameScheduleTitle",
  TIME_OVERLAP: "timeConflictTitle",
  SAME_ACTIVITY_SAME_DAY: "sameActivitySameDayTitle",
  OTHER_ACTIVITY_SAME_DAY: "otherActivitySameDayTitle",
} as const;

function formatScheduleRange(item: ApplicationConflictItemResponse, locale: Locale) {
  const date = formatSeoulDateWithWeekday(item.startAt, locale);
  const startTime = formatSeoulTime(item.startAt, locale);
  const endTime = formatSeoulTime(item.endAt, locale);
  if (!date || !startTime || !endTime) return null;

  const startParts = getSeoulDateTimeParts(item.startAt);
  const endParts = getSeoulDateTimeParts(item.endAt);
  const endLabel =
    startParts?.date === endParts?.date
      ? endTime
      : (formatSeoulDateTime(item.endAt, locale) ?? endTime);
  return `${date} · ${startTime} ~ ${endLabel}`;
}

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
  const language = getContentLanguage(locale);
  const t = useTranslations("Booking");
  const applicationsQuery = useQuery({
    ...myApplicationsQueryOptions(language),
    enabled: item !== undefined,
  });
  const existingApplication = item
    ? applicationsQuery.data?.find(
        (application) => application.applicationId === item.applicationId,
      )
    : undefined;
  const existingDateTime = item ? formatScheduleRange(item, locale) : null;
  const thumbnailImageUrl = getActivityThumbnail(existingApplication?.thumbnailImageUrl ?? null);

  return (
    <ConfirmDialog
      title={t(TITLE_KEY_BY_TYPE[type])}
      onClose={onClose}
      confirmSlot={
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          <Link
            href="/applications"
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-ink px-4 font-display text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
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
        <div className="flex items-center gap-3 rounded-2xl border border-l-2 border-line-soft border-l-primary p-3.5">
          <Image
            src={thumbnailImageUrl}
            alt={item.activityTitle}
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink md:text-base">
              {item.activityTitle}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted md:text-sm">
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{existingDateTime}</span>
            </p>
          </div>
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
