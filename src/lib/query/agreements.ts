import { queryOptions } from "@tanstack/react-query";
import { getMyAgreements } from "@/lib/api/agreements";
import { unwrapApiResult } from "@/lib/query/result";

export const agreementKeys = { me: (userId: number) => ["agreements", userId] as const };

export function myAgreementsQueryOptions(userId: number) {
  return queryOptions({
    queryKey: agreementKeys.me(userId),
    queryFn: async () => unwrapApiResult(await getMyAgreements(), "data"),
    staleTime: 0,
    gcTime: 0,
  });
}
