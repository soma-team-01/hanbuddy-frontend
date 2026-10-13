import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateTime } from "@/lib/datetime";
import type { BuddyApplicationApplicantDetailResponse } from "@/types/buddy";

export type ApplicantTimestampValues = Partial<
  Pick<BuddyApplicationApplicantDetailResponse, "status" | "appliedAt" | "cancelledAt">
>;

export function ApplicantTimestamps({
  applicant,
  locale,
}: Readonly<{ applicant: ApplicantTimestampValues; locale: Locale }>) {
  const t = useTranslations("Applicants");
  const appliedAt = applicant.appliedAt ? formatSeoulDateTime(applicant.appliedAt, locale) : null;
  const closedLabel =
    applicant.status === "REJECTED"
      ? "rejectedAt"
      : applicant.status === "EXPIRED"
        ? "expiredAt"
        : applicant.status === "CANCELLED"
          ? "cancelledAt"
          : null;
  const closedAt =
    closedLabel && applicant.cancelledAt
      ? formatSeoulDateTime(applicant.cancelledAt, locale)
      : null;
  if (!appliedAt && !closedAt) return null;

  return (
    <div className="mt-4 space-y-1.5 border-t border-line-soft pt-3 text-xs leading-5 break-words text-muted">
      {appliedAt ? <p>{t("appliedAt", { date: appliedAt })}</p> : null}
      {closedAt && closedLabel ? <p>{t(closedLabel, { date: closedAt })}</p> : null}
    </div>
  );
}
