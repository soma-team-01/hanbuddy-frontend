"use client";

import { useQuery } from "@tanstack/react-query";
import { myProfileQueryOptions } from "@/lib/query/users";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyProfileResult } from "./users";

/** 내 프로필을 로드한다. 미인증 세션이면 로그인 화면으로 보내고 결과를 null로 유지한다. */
export function useMyProfile(): MyProfileResult | null {
  const profileQuery = useQuery(myProfileQueryOptions());
  useAuthQueryRedirect(profileQuery.error);

  if (profileQuery.isPending || profileQuery.error instanceof UnauthenticatedQueryError) {
    return null;
  }
  if (profileQuery.error) {
    return { status: "error", message: profileQuery.error.message } satisfies MyProfileResult;
  }
  return { status: "success", profile: profileQuery.data } satisfies MyProfileResult;
}
