"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { activityPriceQuoteQueryOptions } from "@/lib/query/activities";
import { formatKrw } from "@/lib/format";
import { MinusIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";

export function ActivityBookingPrice({
  activityId,
  guests,
  maxGuests,
  onGuestsChange,
  dateControl,
  bookingPath,
  onBookingClick,
  onLoginRequired,
}: Readonly<{
  activityId: string;
  guests: number;
  maxGuests: number;
  onGuestsChange: (count: number) => void;
  dateControl: ReactNode;
  bookingPath: string | null;
  onBookingClick?: () => void;
  onLoginRequired?: () => void;
}>) {
  const t = useTranslations("QuantityPricing");
  const detailT = useTranslations("ActivityDetail");
  const locale = useLocale();
  const query = useQuery(activityPriceQuoteQueryOptions(activityId, guests));
  const quote =
    !query.isFetching &&
    !query.isError &&
    query.data?.guestCount === guests &&
    String(query.data.activityId) === activityId
      ? query.data
      : null;
  const ready = Boolean(quote && bookingPath && guests <= maxGuests);
  const buttonClass =
    "flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50";
  return (
    <div className="mx-auto grid w-full max-w-[840px] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-x-6">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        {dateControl}
        <div
          role="group"
          aria-label={t("guestsLabel")}
          className="flex h-12 items-center gap-1 rounded-xl border border-line-strong px-1"
        >
          <button
            type="button"
            aria-label={t("less")}
            disabled={guests <= 1}
            onClick={() => onGuestsChange(guests - 1)}
            className="flex size-10 items-center justify-center rounded-lg text-ink disabled:opacity-30"
          >
            <MinusIcon className="size-4" />
          </button>
          <span className="flex min-w-5 items-center gap-1 text-center text-sm font-semibold tabular-nums">
            <UsersIcon className="size-3.5 text-muted" />
            {guests}
          </span>
          <button
            type="button"
            aria-label={t("more")}
            disabled={guests >= maxGuests}
            onClick={() => onGuestsChange(guests + 1)}
            className="flex size-10 items-center justify-center rounded-lg text-ink disabled:opacity-30"
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>
      <div
        className="flex min-w-0 items-center justify-between gap-3"
        data-testid="booking-bar-actions"
      >
        <div className="min-w-0" aria-live="polite">
          {quote ? (
            <>
              <p className="text-xs text-muted">{t("selectedTotal", { count: guests })}</p>
              <p
                className="font-display text-xl font-bold text-primary tabular-nums"
                data-testid="booking-bar-price"
              >
                {formatKrw(quote.amount, locale)}
              </p>
              <p className="text-xs text-muted">
                {t("perGuest", { price: formatKrw(quote.unitPrice, locale) })}
              </p>
            </>
          ) : query.isError ? (
            <div role="alert" className="text-xs text-danger">
              <p>{t("quoteError")}</p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="min-h-11 font-semibold underline"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <p role="status" className="text-xs text-muted">
              {t("loading")}
            </p>
          )}
        </div>
        {!ready ? (
          <button type="button" disabled className={buttonClass}>
            {detailT("bookNow")}
          </button>
        ) : onLoginRequired ? (
          <button
            type="button"
            aria-haspopup="dialog"
            className={buttonClass}
            onClick={() => {
              onBookingClick?.();
              onLoginRequired();
            }}
          >
            {detailT("bookNow")}
          </button>
        ) : (
          <Link href={bookingPath!} onClick={onBookingClick} className={buttonClass}>
            {detailT("bookNow")}
          </Link>
        )}
      </div>
    </div>
  );
}
