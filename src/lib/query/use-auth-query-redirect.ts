"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { useSessionRole } from "@/lib/auth/session-role-context";

export function useAuthQueryRedirect(error: Error | null) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionRole = useSessionRole();

  useEffect(() => {
    if (isUnauthenticatedError(error)) {
      queryClient.clear();
      router.replace(sessionRole === "buddy" ? "/buddy" : "/login", { locale });
      router.refresh();
    }
  }, [error, locale, queryClient, router, sessionRole]);
}
