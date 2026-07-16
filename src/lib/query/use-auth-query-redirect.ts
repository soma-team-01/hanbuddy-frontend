"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { UnauthenticatedQueryError } from "./result";

export function useAuthQueryRedirect(error: Error | null) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (error instanceof UnauthenticatedQueryError) {
      queryClient.clear();
      router.replace("/login", { locale });
      router.refresh();
    }
  }, [error, locale, queryClient, router]);
}
