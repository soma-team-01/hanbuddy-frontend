import { queryOptions } from "@tanstack/react-query";
import { getBuddyApplicationForAdmin, getBuddyApplicationsForAdmin } from "@/lib/api/admin";
import { unwrapApiResult } from "./result";

export const adminKeys = {
  all: ["admin"] as const,
  applications: ["admin", "buddy-applications"] as const,
  application: (userId: number | string) =>
    ["admin", "buddy-applications", String(userId)] as const,
};

export function adminBuddyApplicationsQueryOptions() {
  return queryOptions({
    queryKey: adminKeys.applications,
    queryFn: async () => unwrapApiResult(await getBuddyApplicationsForAdmin(), "applications"),
  });
}

export function adminBuddyApplicationQueryOptions(userId: number | string) {
  return queryOptions({
    queryKey: adminKeys.application(userId),
    queryFn: async () => unwrapApiResult(await getBuddyApplicationForAdmin(userId), "application"),
  });
}
