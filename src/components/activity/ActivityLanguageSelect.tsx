"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getActivityLanguages } from "@/lib/api/activities";
import { unwrapApiResult } from "@/lib/query/result";
import { isActivityLanguage, type ActivityLanguage } from "@/types/activity-language";

export function ActivityLanguageSelect({
  value,
  onChange,
  disabled,
}: Readonly<{
  value: ActivityLanguage[];
  onChange: (value: ActivityLanguage[]) => void;
  disabled?: boolean;
}>) {
  const t = useTranslations("ActivityLanguages");
  const query = useQuery({
    queryKey: ["activity-languages"],
    queryFn: async () => unwrapApiResult(await getActivityLanguages(), "languages"),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{t("title")}</legend>
      {query.isPending ? (
        <p role="status" className="text-sm text-muted">
          {t("loading")}
        </p>
      ) : null}
      {query.isError ? (
        <>
          <p role="alert" className="text-sm text-danger">
            {t("loadFailed")}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="min-h-11 text-sm text-primary underline"
          >
            {t("retry")}
          </button>
        </>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(query.data ?? []).filter(isActivityLanguage).map((code) => (
          <label
            key={code}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${value.includes(code) ? "border-primary bg-primary-soft text-primary-strong" : "border-line-soft text-ink"}`}
          >
            <input
              type="checkbox"
              checked={value.includes(code)}
              onChange={(event) =>
                onChange(
                  event.target.checked ? [...value, code] : value.filter((item) => item !== code),
                )
              }
              className="size-4 shrink-0 accent-primary"
            />
            {t(`names.${code}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
