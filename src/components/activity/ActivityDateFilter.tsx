"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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
export function ActivityDateFilter({
  date = "",
  destination,
}: Readonly<{ date?: string; destination?: "/explore" }>) {
  const t = useTranslations("ActivitySearch");
  const locale = getLocaleOrDefault(useLocale());
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [homeDate, setHomeDate] = useState(date);
  const root = useRef<HTMLDivElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const sourceDate = destination ? homeDate : date;
  const value = isActivitySearchDate(sourceDate) ? sourceDate : "";
  const invalid = Boolean(sourceDate) && !value;

  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !calendar.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
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
    router.push(withActivityDate(destination ?? `${pathname}?${search.toString()}`, nextDate), {
      scroll: Boolean(destination),
    });
  }

  function clear() {
    if (destination) setHomeDate("");
    else apply("");
  }

  return (
    <div
      ref={root}
      className="relative w-full max-w-xs text-ink md:max-w-md"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget) &&
          !calendar.current?.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <div className="flex items-center gap-1 rounded-full border border-line-strong bg-canvas-soft shadow-[0_3px_12px_rgba(38,27,24,0.04)] md:p-1">
        <button
          ref={trigger}
          type="button"
          aria-label={`${t("label")}: ${value ? formatDateKeyLong(value, locale) : t("placeholder")}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-h-11 md:gap-3"
        >
          <CalendarIcon className="size-4 shrink-0 text-muted md:size-5" />
          <span className="min-w-0 truncate text-sm text-muted">
            {value ? formatDateKeyLong(value, locale) : t("placeholder")}
          </span>
        </button>
        <button
          type="button"
          aria-label={t("search")}
          onClick={() => setOpen(true)}
          className="group flex size-10 shrink-0 items-center justify-center rounded-full text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:size-11"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary transition group-hover:bg-primary-hover md:size-11">
            <SearchIcon className="size-4 md:size-5" />
          </span>
        </button>
      </div>
      {invalid ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t("invalid")}
        </p>
      ) : null}
      {open ? (
        <DateCalendar
          id={id}
          value={value}
          anchorRef={root}
          panelRef={calendar}
          onApply={apply}
          onClear={clear}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

function DateCalendar({
  id,
  value,
  anchorRef,
  panelRef,
  onApply,
  onClear,
  onClose,
}: Readonly<{
  id: string;
  value: string;
  anchorRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  onApply: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}>) {
  const t = useTranslations("ActivitySearch");
  const locale = getLocaleOrDefault(useLocale());
  const today = getSeoulNowParts().date;
  const initial = value || today;
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [focused, setFocused] = useState(initial);
  const daysRef = useRef<HTMLDivElement>(null);
  useCalendarPosition(anchorRef, panelRef);
  useEffect(() => {
    daysRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus({ preventScroll: true });
  }, [focused]);

  function moveMonth(delta: number) {
    const next = addMonthsToMonthKey(month, delta);
    setMonth(next);
    setFocused(`${next}-01`);
  }

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={t("label")}
      className="fixed z-[60] max-h-[calc(100dvh-24px)] w-[304px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-line-soft bg-canvas-soft p-3 text-ink shadow-[0_12px_36px_rgba(38,27,24,0.16)]"
    >
      <div className="flex items-center justify-between gap-1">
        <p aria-live="polite" className="font-display text-sm font-bold">
          {formatMonthKeyTitle(month, locale)}
        </p>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={t("previousMonth")}
            disabled={month <= "1000-01"}
            onClick={() => moveMonth(-1)}
            className="flex size-8 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            disabled={month >= "9999-12"}
            onClick={() => moveMonth(1)}
            className="flex size-8 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
          >
            <ArrowRightIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="ml-1 flex size-8 items-center justify-center rounded-full text-muted hover:bg-panel"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">{t("timezone")}</p>
      <div aria-hidden className="mt-2 grid grid-cols-7 text-center text-xs text-muted">
        {weekDateKeys(today).map((day) => (
          <span key={day} className="py-1">
            {formatDateKeyWeekday(day, locale)}
          </span>
        ))}
      </div>
      <div ref={daysRef} className="grid grid-cols-7">
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
              className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${day === selected ? "bg-primary font-bold text-on-primary" : "text-ink hover:bg-primary-soft"} ${day === today ? "font-bold ring-1 ring-line-strong ring-inset" : ""}`}
            >
              {Number(day.slice(-2))}
            </button>
          ) : (
            <span key={`blank-${index}`} aria-hidden />
          ),
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line-soft pt-2">
        <button
          type="button"
          onClick={() => {
            setSelected("");
            onClear();
          }}
          className="min-h-9 rounded-lg border border-line-strong text-xs font-bold hover:bg-panel"
        >
          {t("clear")}
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => onApply(selected)}
          className="min-h-9 rounded-lg bg-primary text-xs font-bold text-on-primary hover:bg-primary-hover disabled:opacity-40"
        >
          {t("apply")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Position independently of hero transforms, without moving the page to reach a focused day. */
function useCalendarPosition(
  anchorRef: RefObject<HTMLDivElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const viewport = window.visualViewport;
    function position() {
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const popup = panel.getBoundingClientRect();
      const topEdge = (viewport?.offsetTop ?? 0) + 12;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 24;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 24;
      const spaceAbove = rect.top - 8 - topEdge;
      const spaceBelow = bottomEdge - rect.bottom - 8;
      let top = rect.bottom + 8;
      if (popup.height > spaceBelow && spaceAbove > spaceBelow) top = rect.top - 8 - popup.height;
      panel.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - popup.height))}px`;
      panel.style.left = `${Math.max(leftEdge, Math.min(rect.left, rightEdge - popup.width))}px`;
    }
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    observer?.observe(panel);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
    };
  }, [anchorRef, panelRef]);
}
