import { queryOptions } from "@tanstack/react-query";
import { getMyApplications } from "@/lib/api/applications";
import { unwrapApiResult } from "./result";

export const applicationKeys = {
  all: () => ["applications"] as const,
  mine: () => [...applicationKeys.all(), "me"] as const,
};

/** 결제 대기 신청의 좌석 선점이 풀리는 주기(15분)보다 짧게 다시 확인한다 */
const PENDING_PAYMENT_REFRESH_MS = 60_000;

export function myApplicationsQueryOptions() {
  return queryOptions({
    queryKey: applicationKeys.mine(),
    queryFn: async () => unwrapApiResult(await getMyApplications(), "applications"),
    // 선점이 만료된 결제 대기 신청은 백엔드 목록에서 빠지므로 주기적으로 다시 불러온다
    refetchInterval: (query) =>
      query.state.data?.some((application) => application.status === "PENDING_PAYMENT")
        ? PENDING_PAYMENT_REFRESH_MS
        : false,
    refetchOnWindowFocus: true,
  });
}
