"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { sanitizeReturnToPath, stripLocaleFromPathname } from "@/lib/auth/return-to";
import { useSessionRole } from "@/lib/auth/session-role-context";

export function useAuthQueryRedirect(error: Error | null) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionRole = useSessionRole();

  useEffect(() => {
    if (isUnauthenticatedError(error)) {
      queryClient.clear();
      if (sessionRole === "buddy") {
        router.replace("/buddy", { locale });
      } else {
        // 로그인 후 지금 보던 화면으로 복귀할 수 있게 현재 경로를 넘긴다
        const returnTo = sanitizeReturnToPath(
          `${stripLocaleFromPathname(window.location.pathname)}${window.location.search}`,
        );
        router.replace(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login", {
          locale,
        });
      }
      router.refresh();
    }
  }, [error, locale, queryClient, router, sessionRole]);
}
