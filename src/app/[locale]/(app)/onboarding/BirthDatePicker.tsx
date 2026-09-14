"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BirthDateSelect } from "@/app/[locale]/(app)/onboarding/BirthDateSelect";
import { daysInMonth, isValidBirthDate } from "./birth-date";

type Part = "year" | "month" | "day";
type Reselection = "reselectDay" | "reselectMonthDay" | null;

function dateParts(value: string, valid: boolean) {
  const [year = "", month = "", day = ""] = valid ? value.split("-") : [];
  return {
    year: year ? String(Number(year)) : "",
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : "",
  };
}

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
  const valid = isValidBirthDate(value, today, oldestAllowedBirthDate, youngestAllowedBirthDate);
  const [selection, setSelection] = useState(() => ({
    sourceValue: value,
    sourceValid: valid,
    parts: dateParts(value, valid),
    reselection: null as Reselection,
  }));
  // Restore parent-supplied drafts without resetting incomplete local selections.
  if (value !== selection.sourceValue || valid !== selection.sourceValid) {
    setSelection({
      sourceValue: value,
      sourceValid: valid,
      parts: dateParts(value, valid),
      reselection: null,
    });
  }
  const { parts, reselection } = selection;
  const order: Part[] = locale === "en" ? ["month", "day", "year"] : ["year", "month", "day"];
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2000, i, 1)),
    ),
  );
  const upperBound = youngestAllowedBirthDate < today ? youngestAllowedBirthDate : today;
  const firstYear = Number(oldestAllowedBirthDate.slice(0, 4));
  const lastYear = Number(upperBound.slice(0, 4));
  const optionCounts: Record<Part, number> = {
    year: Math.max(0, lastYear - firstYear + 1),
    month: 12,
    day: daysInMonth(Number(parts.year), Number(parts.month)),
  };
  const descriptionIds =
    [invalid && `${id}-error`, reselection && `${id}-status`].filter(Boolean).join(" ") ||
    undefined;

  function allowed(part: Part, number: number, current: typeof parts) {
    if (!oldestAllowedBirthDate || !upperBound) return false;
    if (part === "year") return number >= firstYear && number <= lastYear;
    if (!current.year) return true;
    const prefix = `${current.year.padStart(4, "0")}-${String(part === "month" ? number : current.month).padStart(2, "0")}`;
    if (part === "month")
      return `${prefix}-31` >= oldestAllowedBirthDate && `${prefix}-01` <= upperBound;
    if (!current.month) return true;
    const candidate = `${prefix}-${String(number).padStart(2, "0")}`;
    return (
      number <= daysInMonth(Number(current.year), Number(current.month)) &&
      candidate >= oldestAllowedBirthDate &&
      candidate <= upperBound
    );
  }

  function change(part: Part, next: string) {
    if (next && !allowed(part, Number(next), parts)) return;
    const updated = { ...parts, [part]: next };
    let nextReselection = reselection;
    if (updated.month && !allowed("month", Number(updated.month), updated)) {
      updated.month = "";
      updated.day = "";
      nextReselection = "reselectMonthDay";
    } else if (updated.day && !allowed("day", Number(updated.day), updated)) {
      updated.day = "";
      nextReselection ??= "reselectDay";
    } else if (updated.month && updated.day) {
      nextReselection = null;
    }
    const candidate = `${updated.year.padStart(4, "0")}-${updated.month.padStart(2, "0")}-${updated.day.padStart(2, "0")}`;
    const nextValue =
      updated.year &&
      updated.month &&
      updated.day &&
      isValidBirthDate(candidate, today, oldestAllowedBirthDate, youngestAllowedBirthDate)
        ? candidate
        : "";
    setSelection({
      sourceValue: nextValue,
      sourceValid: Boolean(nextValue),
      parts: updated,
      reselection: nextReselection,
    });
    onChange(nextValue);
  }

  return (
    <fieldset className="w-full min-w-0" aria-describedby={descriptionIds}>
      <legend className="mb-2 text-sm font-medium text-ink">{t("label")}</legend>
      <div
        className={
          locale === "en"
            ? "grid grid-cols-[1.4fr_0.8fr_1fr] gap-2"
            : "grid grid-cols-[1.2fr_1fr_0.8fr] gap-2"
        }
      >
        {order.map((part) => (
          <BirthDateSelect
            key={part}
            label={t(part)}
            value={parts[part]}
            invalid={invalid}
            describedBy={descriptionIds}
            onChange={(next) => change(part, next)}
            options={[
              { value: "", label: t(part) },
              ...Array.from({ length: optionCounts[part] }, (_, i) => {
                const number = part === "year" ? lastYear - i : i + 1;
                return {
                  value: String(number),
                  label: part === "month" ? months[number - 1] : String(number),
                  disabled: !allowed(part, number, parts),
                };
              }),
            ]}
          />
        ))}
      </div>
      {invalid && (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {validationT("birthDateInvalid")}
        </p>
      )}
      <output id={`${id}-status`} className="block text-sm text-muted not-empty:mt-2 empty:hidden">
        {reselection ? t(reselection) : ""}
      </output>
    </fieldset>
  );
}
