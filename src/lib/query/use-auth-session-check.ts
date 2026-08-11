"use client";

import { useQuery } from "@tanstack/react-query";
import { myProfileQueryOptions } from "./users";
import { useAuthQueryRedirect } from "./use-auth-query-redirect";

export function useAuthSessionCheck() {
  const sessionQuery = useQuery({
    ...myProfileQueryOptions(),
    refetchOnMount: "always",
  });
  useAuthQueryRedirect(sessionQuery.error);
}
