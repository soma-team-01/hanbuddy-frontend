"use client";

import { useQuery } from "@tanstack/react-query";
import { myProfileQueryOptions } from "@/lib/query/users";
import { useAnalyticsEnabled, useAnalyticsView } from "./AnalyticsProvider";

/** A cached public activity is not authentication evidence. Wait for the owned profile check. */
export function useBeginCheckout(activityId: number, usable: boolean) {
  const enabled = useAnalyticsEnabled();
  const profile = useQuery({
    ...myProfileQueryOptions(),
    enabled: enabled && usable,
    staleTime: 0,
    refetchOnMount: "always",
  });
  useAnalyticsView(
    "begin_checkout",
    activityId,
    usable &&
      enabled &&
      profile.isSuccess &&
      !profile.isFetching &&
      profile.data.userType === "TOURIST",
  );
}
