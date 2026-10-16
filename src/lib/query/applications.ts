import { queryOptions, type QueryState } from "@tanstack/react-query";
import {
  getApplicationCancellationQuote,
  getAppliedActivityDetail,
  getMyApplications,
} from "@/lib/api/applications";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { unwrapApiResult } from "./result";
import { isPayPalResultPending } from "@/lib/payments/paypal-authorization";
import type { ApplicationResponse } from "@/types/application";

export const applicationKeys = {
  all: () => ["applications"] as const,
  mine: (language?: ContentLanguage) =>
    language
      ? ([...applicationKeys.all(), "me", language] as const)
      : ([...applicationKeys.all(), "me"] as const),
  cancellationQuote: (applicationId: number | string) =>
    [...applicationKeys.all(), "me", String(applicationId), "cancellation-quote"] as const,
  activityDetail: (
    applicationId: number | string,
    language: ContentLanguage,
    displayCurrency: DisplayCurrency,
  ) =>
    [
      ...applicationKeys.all(),
      "me",
      String(applicationId),
      "activity",
      language,
      displayCurrency,
    ] as const,
};

/** 승인·예약·환불의 서버 상태를 주기적으로 다시 확인한다. */
const APPLICATION_REFRESH_MS = 60_000;
const PAYPAL_RESULT_READ_LIMIT = 6;
type RecoveryReadBudget = { stage: string; firstRead: number };
// Query identity survives option recreation, but is released with its cache entry.
const recoveryReadBudgets = new WeakMap<object, Map<number, RecoveryReadBudget>>();

/** Bound each unresolved payment stage without stopping unrelated approval/refund updates. */
function applicationsRefetchInterval(query: {
  state: Pick<
    QueryState<ApplicationResponse[], Error>,
    "data" | "dataUpdateCount" | "errorUpdateCount"
  >;
}) {
  const previous = recoveryReadBudgets.get(query);
  const pending = new Map<number, RecoveryReadBudget>();
  const readCount = query.state.dataUpdateCount + query.state.errorUpdateCount;
  let needsRefresh = false;

  for (const application of query.state.data ?? []) {
    if (application.refund?.status === "REQUESTED" || application.refund?.status === "FAILED") {
      needsRefresh = true;
    }
    if (isPayPalResultPending(application)) {
      const stage = `${application.paypalAuthorization?.state}:${application.paymentStatus}`;
      const existing = previous?.get(application.applicationId);
      const budget =
        existing?.stage === stage && existing.firstRead <= readCount
          ? existing
          : { stage, firstRead: readCount };
      pending.set(application.applicationId, budget);
      if (readCount - budget.firstRead + 1 < PAYPAL_RESULT_READ_LIMIT) needsRefresh = true;
    } else if (
      application.status === "PENDING_PAYMENT" ||
      application.status === "PENDING_APPROVAL" ||
      application.status === "CONFIRMED"
    ) {
      needsRefresh = true;
    }
  }

  // Drop completed or removed applications; a later recovery stage gets its own budget.
  recoveryReadBudgets.set(query, pending);
  return needsRefresh ? APPLICATION_REFRESH_MS : false;
}

/** Preserve lifecycle polling and foreground refresh while bounding unresolved PayPal reads. */
export function myApplicationsQueryOptions(language: ContentLanguage) {
  return queryOptions({
    queryKey: applicationKeys.mine(language),
    queryFn: async () => unwrapApiResult(await getMyApplications(language), "applications"),
    // 결제 선점 만료, 버디 응답, 비동기 환불은 서버 응답으로만 확정한다.
    refetchInterval: applicationsRefetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function appliedActivityDetailQueryOptions(
  applicationId: number | string,
  language: ContentLanguage,
  displayCurrency: DisplayCurrency,
) {
  return queryOptions({
    queryKey: applicationKeys.activityDetail(applicationId, language, displayCurrency),
    queryFn: async () =>
      unwrapApiResult(
        await getAppliedActivityDetail(applicationId, language, displayCurrency),
        "appliedActivity",
      ),
    retry: false,
  });
}

export function cancellationQuoteQueryOptions(applicationId: number | string) {
  return queryOptions({
    queryKey: applicationKeys.cancellationQuote(applicationId),
    queryFn: async () =>
      unwrapApiResult(await getApplicationCancellationQuote(applicationId), "quote"),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });
}
