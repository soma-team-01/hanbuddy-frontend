"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/format";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { applicationKeys } from "@/lib/query/applications";
import { applicationScheduleCancellationQueryOptions } from "@/lib/query/schedule-cancellation";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ScheduleCancellationApplicant } from "@/types/schedule-cancellation";

export function ScheduleRefundStatus({ task }: Readonly<{ task: ScheduleCancellationApplicant }>) {
  const t = useTranslations("ScheduleCancellation");
  // Keep internal review codes and monetary details out of card summaries.
  return (
    <div className="text-sm" role="status">
      <p className="font-medium text-primary">{t(`statuses.${task.refundStatus}`)}</p>
    </div>
  );
}

export function ScheduleRefundAmount({ task }: Readonly<{ task: ScheduleCancellationApplicant }>) {
  const t = useTranslations("ScheduleCancellation");
  const locale = useLocale();
  // This is the current linked refund, not a cumulative refund total.
  const amount = task.additionalRefundAmount;
  const showAmount =
    task.refundStatus !== "EXCLUDED" &&
    task.refundStatus !== "NO_PAYMENT" &&
    amount !== null &&
    Number.isFinite(amount) &&
    Boolean(task.currency?.match(/^[A-Z]{3}$/));
  if (!showAmount) return null;
  return (
    <div className="mt-1 flex justify-between gap-3 border-t border-line-soft pt-3 font-medium">
      <span>{t("refundAmount")}</span>
      <span className="tabular-nums">{formatCurrency(amount!, task.currency!, locale)}</span>
    </div>
  );
}

export function useApplicationScheduleRefundQuery(applicationId: string, enabled = true) {
  const query = useQuery({
    ...applicationScheduleCancellationQueryOptions(applicationId),
    enabled,
  });
  const client = useQueryClient();
  useAuthQueryRedirect(query.error);
  useEffect(() => {
    if (query.error instanceof ApiClientError && query.error.code === "SCHEDULE400_NOT_CANCELLED") {
      void client.invalidateQueries({ queryKey: applicationKeys.mine() });
    }
  }, [client, query.error]);
  return query;
}

export function ApplicationScheduleRefundStatus({
  query,
}: Readonly<{ query: ReturnType<typeof useApplicationScheduleRefundQuery> }>) {
  const t = useTranslations("ScheduleCancellation");
  const getApiErrorMessage = useApiErrorMessage();
  return (
    <div className="mt-2">
      {query.data ? (
        <ScheduleRefundStatus task={query.data} />
      ) : (
        <p className="text-sm text-muted">
          {query.isError ? getApiErrorMessage(query.error, t("loadError")) : t("statuses.QUEUED")}
        </p>
      )}
      {query.isError && query.data ? (
        <p className="mt-1 text-sm text-muted">{t("loadError")}</p>
      ) : null}
      {query.isError || query.data?.refundStatus === "REVIEW_REQUIRED" ? (
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
