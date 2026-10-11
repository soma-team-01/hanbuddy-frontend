"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, XIcon } from "@/components/ui/icons";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import {
  addMonthsToMonthKey,
  dayNumberOf,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthGridDateKeys,
  monthKeyOf,
  weekDateKeys,
} from "@/lib/buddy-calendar";

export function DiscountEndDateField({
  value,
  minDate,
  onChange,
}: Readonly<{
  value: string;
  minDate: string;
  onChange: (value: string) => void;
}>) {
  const t = useTranslations("CreateActivity");
  const q = useTranslations("QuantityPricing");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const locale = useLocale() as Locale;
  const label = t("fields.discountEndsAt");
  const displayDate = value
    ? new Intl.DateTimeFormat(getIntlLocale(locale), {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : q("selectEndDate");
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="grid gap-2.5 text-sm text-ink">
      <span className="font-semibold">{label}</span>
      <button
        type="button"
        ref={trigger}
        aria-label={`${label}: ${displayDate}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="focus-border-only flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-left text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft lg:px-4 lg:py-3.5"
      >
        <span>{displayDate}</span>
        <CalendarIcon className="size-4 shrink-0 text-primary" />
      </button>
      {open && (
        <EndDateCalendar
          value={value}
          minDate={minDate}
          label={label}
          locale={locale}
          onClose={close}
          onSelect={(date) => {
            onChange(date);
            close();
          }}
        />
      )}
    </div>
  );
}

function EndDateCalendar({
  value,
  minDate,
  label,
  locale,
  onClose,
  onSelect,
}: Readonly<{
  value: string;
  minDate: string;
  label: string;
  locale: Locale;
  onClose: () => void;
  onSelect: (date: string) => void;
}>) {
  const t = useTranslations("BuddyDashboard");
  const a = useTranslations("Accessibility");
  const [month, setMonth] = useState(monthKeyOf(value && value >= minDate ? value : minDate));
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${value >= minDate ? value : minDate}"]`)
      ?.focus();
  }, [value, minDate]);
  function close() {
    dialog.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="motion-dialog m-0 mt-auto w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-5 text-ink shadow-xl backdrop:bg-ink/40 md:m-auto md:w-[360px] md:rounded-2xl"
    >
      <div className="mx-auto max-w-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id={headingId} className="font-display text-base font-bold">
            {label}
          </h3>
          <button
            type="button"
            onClick={close}
            aria-label={a("closeDialog")}
            className="flex size-11 items-center justify-center rounded-full text-muted"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label={t("previousMonth")}
            disabled={month <= monthKeyOf(minDate)}
            onClick={() => setMonth(addMonthsToMonthKey(month, -1))}
            className="flex size-11 items-center justify-center rounded-full text-primary disabled:text-muted/30"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <p aria-live="polite" className="text-sm font-semibold">
            {formatMonthKeyTitle(month, locale)}
          </p>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setMonth(addMonthsToMonthKey(month, 1))}
            className="flex size-11 items-center justify-center rounded-full text-primary"
          >
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
        <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted">
          {weekDateKeys(minDate).map((date) => (
            <span key={date} className="py-2">
              {formatDateKeyWeekday(date, locale)}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {monthGridDateKeys(month).map((date, index) =>
            date ? (
              <button
                type="button"
                key={date}
                data-date={date}
                aria-label={date}
                aria-pressed={date === value}
                aria-current={date === minDate ? "date" : undefined}
                disabled={date < minDate}
                onClick={() => {
                  dialog.current?.close();
                  onSelect(date);
                }}
                className={`focus-border-only mx-auto flex size-11 items-center justify-center rounded-full border text-sm tabular-nums focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary-soft disabled:text-muted/30 ${date === value ? "border-primary bg-primary text-white" : "border-transparent enabled:hover:border-primary enabled:hover:text-primary"}`}
              >
                {dayNumberOf(date)}
              </button>
            ) : (
              <span key={`empty-${index}`} />
            ),
          )}
        </div>
      </div>
    </dialog>
  );
}
