import { queryOptions } from "@tanstack/react-query";
import { getMyApplications } from "@/lib/api/applications";
import { unwrapApiResult } from "./result";

export const applicationKeys = {
  all: () => ["applications"] as const,
  mine: () => [...applicationKeys.all(), "me"] as const,
};

export function myApplicationsQueryOptions() {
  return queryOptions({
    queryKey: applicationKeys.mine(),
    queryFn: async () => unwrapApiResult(await getMyApplications(), "applications"),
  });
}
