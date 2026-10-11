"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { buddyPendingApprovalsQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { PendingReservationSection } from "./PendingReservationSection";

export function PendingReservationInbox({
  view = "preview",
}: Readonly<{ view?: "preview" | "list" }>) {
  const query = useInfiniteQuery(buddyPendingApprovalsQueryOptions());
  const t = useTranslations("BuddyDashboard");
  const getError = useApiErrorMessage();
  useAuthQueryRedirect(query.error);
  // Offset pages can overlap when new requests arrive between loads.
  const requests = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.content) ?? []).map((item) => [
        item.applicationId,
        item,
      ]),
    ).values(),
  );
  const error = query.error ? getError(query.error, t("applicantsLoadError")) : null;
  return (
    <PendingReservationSection
      view={view}
      requests={requests.map((item) => ({ ...item, applicant: item }))}
      totalCount={query.data?.pages[0]?.totalElements ?? 0}
      loading={query.isPending}
      error={query.isFetchNextPageError ? null : error}
      onRetry={() => {
        void query.refetch();
      }}
      hasMore={query.hasNextPage}
      loadingMore={query.isFetching}
      moreError={query.isFetchNextPageError ? error : null}
      onLoadMore={() => {
        if (!query.isFetching) void query.fetchNextPage();
      }}
    />
  );
}
