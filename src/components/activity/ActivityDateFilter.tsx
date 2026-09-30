"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isActivitySearchDate, withActivityDate } from "@/lib/activity-booking-window";

/** A URL-backed single KST day, shared by the public home and explore pages. */
export function ActivityDateFilter({ date = "" }: Readonly<{ date?: string }>) {
  const t = useTranslations("ActivitySearch");
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const [value, setValue] = useState(isActivitySearchDate(date) ? date : "");
  const invalid = Boolean(date) && !isActivitySearchDate(date);

  function apply(nextDate: string) {
    const search = new URLSearchParams(window.location.search);
    router.push(withActivityDate(`${pathname}?${search.toString()}`, nextDate), { scroll: false });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(value);
      }}
      className="mb-6 rounded-2xl border border-line-soft bg-canvas-soft p-4 md:p-5"
      aria-label={t("label")}
    >
      <label htmlFor={id} className="block font-display text-sm font-bold">
        {t("label")}
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="date"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={`${id}-hint`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-canvas-soft px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:max-w-64"
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          {t("search")}
        </button>
        {date || value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              apply("");
            }}
            className="h-11 rounded-xl px-3 text-sm font-semibold text-muted underline underline-offset-4"
          >
            {t("clear")}
          </button>
        ) : null}
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-muted">
        {t("hint")}
      </p>
      {invalid ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("invalid")}
        </p>
      ) : null}
    </form>
  );
}
