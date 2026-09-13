import { queryOptions } from "@tanstack/react-query";
import {
  getApplicationCancellationQuote,
  getAppliedActivityDetail,
  getMyApplications,
} from "@/lib/api/applications";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { unwrapApiResult } from "./result";

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

/** 결제 대기 신청의 좌석 선점이 풀리는 주기(15분)보다 짧게 다시 확인한다 */
const PENDING_PAYMENT_REFRESH_MS = 60_000;

export function myApplicationsQueryOptions(language: ContentLanguage) {
  return queryOptions({
    queryKey: applicationKeys.mine(language),
    queryFn: async () => unwrapApiResult(await getMyApplications(language), "applications"),
    // 선점이 만료된 결제 대기 신청은 백엔드 목록에서 빠지므로 주기적으로 다시 불러온다
    refetchInterval: (query) =>
      query.state.data?.some((application) => application.status === "PENDING_PAYMENT")
        ? PENDING_PAYMENT_REFRESH_MS
        : false,
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
