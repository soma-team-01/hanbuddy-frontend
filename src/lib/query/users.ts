import { queryOptions } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/api/users";
import { unwrapApiResult } from "./result";

export const userKeys = {
  all: () => ["users"] as const,
  me: () => [...userKeys.all(), "me"] as const,
};

export function myProfileQueryOptions() {
  return queryOptions({
    queryKey: userKeys.me(),
    queryFn: async () => unwrapApiResult(await getMyProfile(), "profile"),
    staleTime: 5 * 60_000,
  });
}
