"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getIntlLocale, getLocaleOrDefault } from "@/i18n/routing";
import {
  CalendarIcon,
  SearchIcon,
  XIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import { isActivitySearchDate, withActivityDate } from "@/lib/activity-booking-window";
import { getSeoulNowParts } from "@/lib/datetime";
import {
  addDaysToDateKey,
  addMonthsToMonthKey,
  formatDateKeyLong,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthGridDateKeys,
  weekDateKeys,
} from "@/lib/buddy-calendar";

/** Compact date-only search: no unsupported destination or keyword filters. */
export function ActivityDateFilter({ date = "" }: Readonly<{ date?: string }>) {
  const t = useTranslations("ActivitySearch");
  const locale = getLocaleOrDefault(useLocale());
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const value = isActivitySearchDate(date) ? date : "";
  const invalid = Boolean(date) && !value;

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function apply(nextDate: string) {
    const search = new URLSearchParams(window.location.search);
    close();
    router.push(withActivityDate(`${pathname}?${search.toString()}`, nextDate), { scroll: false });
  }

  return (
    <div
      ref={root}
      className="relative w-full max-w-sm"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
          setOpen(false);
      }}
    >
      <div className="flex items-center gap-2 rounded-full border border-line-strong bg-canvas-soft p-2 shadow-[0_3px_12px_rgba(38,27,24,0.04)]">
        <button
          ref={trigger}
          type="button"
          aria-label={`${t("label")}: ${value ? formatDateKeyLong(value, locale) : t("placeholder")}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-full px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CalendarIcon className="size-5 shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-ink">{t("label")}</span>
            <span className="mt-0.5 block truncate text-sm text-muted">
              {value ? formatDateKeyLong(value, locale) : t("placeholder")}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label={t("search")}
          onClick={() => (value ? apply(value) : setOpen(true))}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <SearchIcon className="size-5" />
        </button>
      </div>
      {invalid ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("invalid")}
        </p>
      ) : null}
      {open ? <DateCalendar id={id} value={value} onApply={apply} onClose={close} /> : null}
    </div>
  );
}

function DateCalendar({
  id,
  value,
  onApply,
  onClose,
}: Readonly<{ id: string; value: string; onApply: (value: string) => void; onClose: () => void }>) {
  const t = useTranslations("ActivitySearch");
  const locale = getLocaleOrDefault(useLocale());
  const today = getSeoulNowParts().date;
  const initial = value || today;
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [focused, setFocused] = useState(initial);
  const daysRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    daysRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused]);

  function moveMonth(delta: number) {
    const next = addMonthsToMonthKey(month, delta);
    setMonth(next);
    setFocused(`${next}-01`);
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-label={t("label")}
      className="absolute top-[calc(100%+10px)] right-0 z-40 w-full min-w-0 rounded-2xl border border-line-soft bg-canvas-soft p-4 shadow-[0_16px_48px_rgba(38,27,24,0.14)] sm:w-96"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{t("timezone")}</span>
        <button
          type="button"
          aria-label={t("close")}
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-panel"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t("previousMonth")}
          disabled={month <= "1000-01"}
          onClick={() => moveMonth(-1)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <p aria-live="polite" className="font-display text-sm font-bold">
          {formatMonthKeyTitle(month, locale)}
        </p>
        <button
          type="button"
          aria-label={t("nextMonth")}
          disabled={month >= "9999-12"}
          onClick={() => moveMonth(1)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
        >
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
      <div aria-hidden className="mt-3 grid grid-cols-7 text-center text-xs text-muted">
        {weekDateKeys(today).map((day) => (
          <span key={day} className="py-2">
            {formatDateKeyWeekday(day, locale)}
          </span>
        ))}
      </div>
      <div ref={daysRef} className="grid grid-cols-7 gap-y-1">
        {monthGridDateKeys(month).map((day, index) =>
          day ? (
            <button
              key={day}
              type="button"
              data-date={day}
              tabIndex={day === focused ? 0 : -1}
              aria-label={new Intl.DateTimeFormat(getIntlLocale(locale), {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(`${day}T00:00:00Z`))}
              aria-pressed={day === selected}
              aria-current={day === today ? "date" : undefined}
              onClick={() => {
                setSelected(day);
                setFocused(day);
              }}
              onKeyDown={(event) => {
                const shift: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                };
                if (!(event.key in shift)) return;
                event.preventDefault();
                const next = addDaysToDateKey(day, shift[event.key]);
                if (!isActivitySearchDate(next)) return;
                setMonth(next.slice(0, 7));
                setFocused(next);
              }}
              className={`mx-auto flex h-10 w-full max-w-10 items-center justify-center rounded-full text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${day === selected ? "bg-primary font-bold text-on-primary" : "text-ink hover:bg-primary-soft"} ${day === today ? "font-bold ring-1 ring-line-strong ring-inset" : ""}`}
            >
              {Number(day.slice(-2))}
            </button>
          ) : (
            <span key={`blank-${index}`} aria-hidden />
          ),
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4">
        <button
          type="button"
          onClick={() => onApply("")}
          className="min-h-11 rounded-xl border border-line-strong text-sm font-bold hover:bg-panel"
        >
          {t("clear")}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => onApply(selected)}
          className="min-h-11 rounded-xl bg-primary text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-40"
        >
          {t("apply")}
        </button>
      </div>
    </div>
  );
}
