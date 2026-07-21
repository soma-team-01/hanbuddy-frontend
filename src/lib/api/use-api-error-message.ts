"use client";

import { useTranslations } from "next-intl";
import { resolveApiErrorMessageKey } from "./error-messages";

export function useApiErrorMessage() {
  const t = useTranslations("ApiErrors");

  return (error: unknown, fallback: string) => {
    const key = resolveApiErrorMessageKey(error);
    return key ? t(key) : fallback;
  };
}
