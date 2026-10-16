import { queryOptions } from "@tanstack/react-query";
import {
  getApplicationCancellationQuote,
  getAppliedActivityDetail,
  getMyApplications,
} from "@/lib/api/applications";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { unwrapApiResult } from "./result";
import { isPayPalResultPending } from "@/lib/payments/paypal-authorization";

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

export function myApplicationsQueryOptions(language: ContentLanguage) {
  return queryOptions({
    queryKey: applicationKeys.mine(language),
    queryFn: async () => unwrapApiResult(await getMyApplications(language), "applications"),
    // 결제 선점 만료, 버디 응답, 비동기 환불은 서버 응답으로만 확정한다.
    refetchInterval: (query) => {
      // Authorization recovery belongs to the backend; only make a bounded set of reads here.
      if (
        query.state.data?.some((item) => item.paypalAuthorization) &&
        query.state.dataUpdateCount + query.state.errorUpdateCount >= 6
      )
        return false;
      return query.state.data?.some(
        (application) =>
          application.status === "PENDING_PAYMENT" ||
          application.status === "PENDING_APPROVAL" ||
          application.status === "CONFIRMED" ||
          isPayPalResultPending(application) ||
          application.refund?.status === "REQUESTED" ||
          application.refund?.status === "FAILED",
      )
        ? APPLICATION_REFRESH_MS
        : false;
    },
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
