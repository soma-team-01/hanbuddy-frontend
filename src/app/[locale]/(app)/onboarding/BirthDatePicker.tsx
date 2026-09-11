"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon } from "@/components/ui/icons";
import { daysInMonth, isValidBirthDate } from "./birth-date";

type Part = "year" | "month" | "day";

export function BirthDatePicker({
  value,
  onChange,
  today,
  oldestAllowedBirthDate,
  youngestAllowedBirthDate,
  invalid = false,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  today: string;
  oldestAllowedBirthDate: string;
  youngestAllowedBirthDate: string;
  invalid?: boolean;
}>) {
  const t = useTranslations("BirthDatePicker");
  const validationT = useTranslations("Onboarding.validation");
  const locale = useLocale();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstSelect = useRef<HTMLSelectElement>(null);
  const [reselectDay, setReselectDay] = useState(false);
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState({ year: "", month: "", day: "" });
  const order: Part[] = locale === "en" ? ["month", "day", "year"] : ["year", "month", "day"];
  const valid = isValidBirthDate(value, today, oldestAllowedBirthDate, youngestAllowedBirthDate);
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2000, i, 1)),
    ),
  );
  const display = valid
    ? (() => {
        const [year, month, day] = value.split("-");
        return locale === "en"
          ? `${months[Number(month) - 1]} ${Number(day)}, ${year}`
          : `${year} / ${month} / ${day}`;
      })()
    : t("placeholder");

  useEffect(() => {
    if (!open) return;
    firstSelect.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  const upperBound = youngestAllowedBirthDate < today ? youngestAllowedBirthDate : today;
  const firstYear = Number(oldestAllowedBirthDate.slice(0, 4));
  const lastYear = Number(upperBound.slice(0, 4));

  function allowed(part: Part, number: number, selection: typeof parts) {
    if (!oldestAllowedBirthDate || !upperBound) return false;
    if (part === "year") return number >= firstYear && number <= lastYear;
    if (!selection.year) return true;
    const prefix = `${selection.year.padStart(4, "0")}-${String(part === "month" ? number : selection.month).padStart(2, "0")}`;
    if (part === "month")
      return `${prefix}-31` >= oldestAllowedBirthDate && `${prefix}-01` <= upperBound;
    if (!selection.month) return true;
    const candidate = `${prefix}-${String(number).padStart(2, "0")}`;
    return (
      number <= daysInMonth(Number(selection.year), Number(selection.month)) &&
      candidate >= oldestAllowedBirthDate &&
      candidate <= upperBound
    );
  }

  function change(part: Part, next: string) {
    if (next && !allowed(part, Number(next), parts)) return;
    const updated = { ...parts, [part]: next };
    if (updated.month && !allowed("month", Number(updated.month), updated)) {
      updated.month = "";
      updated.day = "";
      setReselectDay(true);
    } else if (updated.day && !allowed("day", Number(updated.day), updated)) {
      updated.day = "";
      setReselectDay(true);
    } else if (part === "day") setReselectDay(false);
    setParts(updated);
    const candidate = `${updated.year.padStart(4, "0")}-${updated.month.padStart(2, "0")}-${updated.day.padStart(2, "0")}`;
    onChange(
      updated.year &&
        updated.month &&
        updated.day &&
        isValidBirthDate(candidate, today, oldestAllowedBirthDate, youngestAllowedBirthDate)
        ? candidate
        : "",
    );
  }

  return (
    <div
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {t("label")}
      </span>
      <button
        ref={trigger}
        type="button"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-value${invalid ? ` ${id}-error` : ""}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          const [year = "", month = "", day = ""] = valid ? value.split("-") : [];
          setParts({
            year: year ? String(Number(year)) : "",
            month: month ? String(Number(month)) : "",
            day: day ? String(Number(day)) : "",
          });
          setReselectDay(false);
          setOpen(true);
        }}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-left text-base text-ink focus-visible:outline-2 focus-visible:outline-primary-strong"
      >
        <span id={`${id}-value`}>{display}</span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0" />
      </button>
      {invalid && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {validationT("birthDateInvalid")}
        </p>
      )}
      {open && (
        <div
          id={`${id}-panel`}
          role="group"
          aria-labelledby={`${id}-label`}
          className="rounded-xl border border-line-strong bg-panel-raised p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {order.map((part, index) => (
              <label
                key={part}
                className="flex min-w-0 flex-col gap-1 text-sm font-medium text-ink"
              >
                {t(part)}
                <select
                  ref={index === 0 ? firstSelect : undefined}
                  value={parts[part]}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? `${id}-error` : undefined}
                  onChange={(event) => change(part, event.target.value)}
                  className="min-h-12 w-full min-w-0 rounded-lg border border-line-strong bg-canvas-soft px-2 text-base focus-visible:outline-2 focus-visible:outline-primary-strong"
                >
                  <option value="">{t("choose")}</option>
                  {Array.from(
                    {
                      length:
                        part === "year"
                          ? Math.max(0, lastYear - firstYear + 1)
                          : part === "month"
                            ? 12
                            : daysInMonth(Number(parts.year), Number(parts.month)),
                    },
                    (_, i) => {
                      const number = part === "year" ? lastYear - i : i + 1;
                      return (
                        <option
                          key={number}
                          value={number}
                          disabled={!allowed(part, number, parts)}
                        >
                          {part === "month" ? months[number - 1] : number}
                        </option>
                      );
                    },
                  )}
                </select>
              </label>
            ))}
          </div>
          <p role="status" className="mt-3 text-sm text-muted">
            {reselectDay ? t("reselectDay") : validationT("birthDateInvalid")}
          </p>
          <button
            type="button"
            onClick={close}
            disabled={!valid}
            className="mt-4 min-h-11 w-full rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
          >
            {t("done")}
          </button>
        </div>
      )}
    </div>
  );
}
