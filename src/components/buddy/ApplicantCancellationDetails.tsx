import { useTranslations } from "next-intl";
import { CancellationReasonText } from "@/components/activity/CancellationReasonText";
import { isBuddyRejection, isDeclinedApplicationStatus } from "@/lib/application-approval";
import type { BuddyApplicationApplicantDetailResponse } from "@/types/buddy";

export type ApplicantCancellationValues = Pick<
  BuddyApplicationApplicantDetailResponse,
  "applicationId"
> &
  Partial<
    Pick<
      BuddyApplicationApplicantDetailResponse,
      "status" | "cancellationReason" | "cancellationDetail"
    >
  >;

export function ApplicantCancellationDetails({
  applicant,
}: Readonly<{ applicant: ApplicantCancellationValues }>) {
  const t = useTranslations("BuddyDashboard");
  const approval = useTranslations("Approval");
  const statusLabel = useTranslations("Status");
  const applications = useTranslations("Applications");
  const declined = isDeclinedApplicationStatus(applicant.status ?? "");
  const cancelled = applicant.status === "CANCELLED";
  const reason = applicant.cancellationReason;
  const reasonKeys = {
    SCHEDULE_CONFLICT: "scheduleConflict",
    ILLNESS: "illness",
    FOUND_OTHER: "foundOther",
    OTHER: "other",
  } as const;
  if (!declined && !cancelled) return null;

  let reasonText: React.ReactNode = null;
  if ((reason === "OTHER" || reason === "BUDDY_OTHER") && applicant.cancellationDetail?.trim()) {
    reasonText = (
      <CancellationReasonText
        kind="application"
        id={applicant.applicationId}
        originalText={applicant.cancellationDetail}
      />
    );
  } else if (reason === "BUDDY_CANCELLATION") reasonText = t("hostCancelled");
  else if (reason && isBuddyRejection(reason)) reasonText = approval(`cancelled.${reason}`);
  else if (reason && reason in reasonKeys)
    reasonText = applications(
      `cancellationReasons.${reasonKeys[reason as keyof typeof reasonKeys]}`,
    );

  return (
    <div className="mt-4">
      <span
        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${declined ? "bg-panel text-muted" : "bg-danger/10 text-danger"}`}
      >
        {statusLabel(declined ? "declined" : "cancelled")}
      </span>
      {reasonText ? (
        <div className="mt-2 text-sm leading-6 [overflow-wrap:anywhere] text-muted">
          {reasonText}
        </div>
      ) : null}
    </div>
  );
}
