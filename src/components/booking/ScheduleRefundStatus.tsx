"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/format";
import { applicationScheduleCancellationQueryOptions } from "@/lib/query/schedule-cancellation";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ScheduleCancellationApplicant } from "@/types/schedule-cancellation";

export function ScheduleRefundStatus({ task }: Readonly<{ task: ScheduleCancellationApplicant }>) {
  const t = useTranslations("ScheduleCancellation");
  const locale = useLocale();
  // Never expose internal reviewReason or imply that EXCLUDED is a completed refund.
  const amount = task.additionalRefundAmount;
  const showAmount =
    task.refundStatus !== "EXCLUDED" &&
    task.refundStatus !== "NO_PAYMENT" &&
    amount !== null &&
    Number.isFinite(amount) &&
    Boolean(task.currency?.match(/^[A-Z]{3}$/));
  return (
    <div className="text-sm" role="status">
      <p className="font-medium text-primary">{t(`statuses.${task.refundStatus}`)}</p>
      {showAmount ? (
        <p className="mt-1 text-xs text-muted">
          {t("currentRefund", { amount: formatCurrency(amount!, task.currency!, locale) })}
        </p>
      ) : null}
    </div>
  );
}

export function ApplicationScheduleRefundStatus({
  applicationId,
}: Readonly<{ applicationId: string }>) {
  const t = useTranslations("ScheduleCancellation");
  const query = useQuery(applicationScheduleCancellationQueryOptions(applicationId));
  useAuthQueryRedirect(query.error);
  return (
    <div className="mt-2">
      {query.data ? (
        <ScheduleRefundStatus task={query.data} />
      ) : (
        <p className="text-sm text-muted">{t(query.isError ? "loadError" : "statuses.QUEUED")}</p>
      )}
      {query.isError ? (
        <button
          type="button"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
          className="mt-1 text-xs text-primary underline"
        >
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}
