"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  buildPricingRequest,
  validatePriceTiers,
  type PricingDraft,
  type PriceTierDraft,
} from "@/lib/activity-pricing";
import { getActivityPricingPreview } from "@/lib/api/activities";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { formatKrw } from "@/lib/format";
import type { ActivityPricingPreview } from "@/types/activity-pricing";
import { XIcon } from "@/components/ui/icons";
import { PricingChoice } from "./PricingChoice";

export function ActivityPriceTierEditor({
  draft,
  onChange,
}: Readonly<{
  draft: PricingDraft;
  onChange: (enabled: boolean, tiers: PriceTierDraft[]) => void;
}>) {
  const t = useTranslations("QuantityPricing");
  const locale = useLocale();
  const tiers = draft.priceTiers ?? [];
  const enabled = draft.quantityPricingEnabled ?? false;
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<"invalidTiers" | null>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const validBounds =
    Number(minimum) >= 2 &&
    Number(minimum) <= 100 &&
    (maximum === "" || (Number(maximum) >= Number(minimum) && Number(maximum) <= 100));

  function addTier() {
    if (!minimum || !price || tiers.length >= 99) return;
    const tier = {
      minGuests: String(Number(minimum)),
      maxGuests: maximum === "" ? "" : String(Number(maximum)),
      unitPrice: price,
    };
    const next = [...tiers, tier];
    if (!validatePriceTiers(next, Number(draft.pricePerPerson))) {
      setError("invalidTiers");
      return;
    }
    onChange(
      true,
      next.sort((a, b) => Number(a.minGuests) - Number(b.minGuests)),
    );
    setMinimum("");
    setMaximum("");
    setPrice("");
    setError(null);
    rangeRef.current?.focus();
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      addTier();
    }
  }
  return (
    <section className="space-y-5">
      <PricingChoice
        enabled={enabled}
        disabledLabel={t("options.none")}
        enabledLabel={t("options.enabled")}
        onChange={(value) => {
          onChange(value, tiers);
        }}
      />
      {enabled && (
        <div className="space-y-3">
          <table className="w-full table-fixed border-collapse text-sm" aria-label={t("enable")}>
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[32%]" />
              <col />
              <col className="w-8 sm:w-11" />
            </colgroup>
            <thead>
              <tr className="border-b border-line-strong text-left text-xs text-muted">
                <th scope="col" className="pb-3 font-medium">
                  {t("guests")}
                </th>
                <th scope="col" className="pb-3 pl-2 font-medium">
                  {t("priceColumn")}
                </th>
                <th scope="col" className="pb-3 pl-2 text-right font-medium">
                  {t("payoutColumn")}
                </th>
                <th scope="col">
                  <span className="sr-only">{t("remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line-soft">
                <th scope="row" className="py-5 text-left font-medium">
                  {t("guestCount", { count: 1 })}
                </th>
                <td className="py-5 pl-2 font-semibold tabular-nums">
                  {formatKrw(Number(draft.pricePerPerson), locale)}
                </td>
                <td className="py-5 pl-2 text-right text-xs text-muted tabular-nums sm:text-sm">
                  <TierPayout draft={draft} />
                </td>
                <td />
              </tr>
              {tiers.map((tier, index) => (
                <tr
                  key={index}
                  aria-label={t("range", { count: index + 1 })}
                  className="border-b border-line-soft"
                >
                  <th scope="row" className="py-4 text-left font-medium">
                    {tier.maxGuests === ""
                      ? t("openRangeLabel", { min: Number(tier.minGuests) })
                      : tier.minGuests === tier.maxGuests
                        ? t("guestCount", { count: Number(tier.minGuests) })
                        : t("rangeLabel", {
                            min: Number(tier.minGuests),
                            max: Number(tier.maxGuests),
                          })}
                  </th>
                  <td className="py-4 pl-2 font-semibold tabular-nums">
                    {formatKrw(Number(tier.unitPrice), locale)}
                  </td>
                  <td className="py-4 pl-2 text-right text-xs text-muted tabular-nums sm:text-sm">
                    <TierPayout draft={draft} tier={tier} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          true,
                          tiers.filter((_, i) => i !== index),
                        )
                      }
                      aria-label={t("removeRange", { count: index + 1 })}
                      className="flex min-h-11 w-full items-center justify-center text-muted hover:text-primary"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,.8fr)_minmax(0,1.3fr)_auto] items-end gap-1.5 pt-3 sm:gap-3">
            {(["fromGuests", "toGuests"] as const).map((field, index) => (
              <label key={field} className="min-w-0 text-xs text-muted">
                {t(field)}
                <input
                  ref={index === 0 ? rangeRef : undefined}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={index === 0 ? minimum : maximum}
                  onChange={(event) => {
                    if (!/^\d{0,3}$/.test(event.target.value)) return;
                    (index === 0 ? setMinimum : setMaximum)(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleEnter}
                  placeholder={index === 0 ? "2" : t("optionalBound")}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className="focus-border-only mt-2 min-h-11 w-full min-w-0 rounded-lg border border-line-strong px-2 text-sm text-ink tabular-nums transition-colors focus:border-primary sm:px-3"
                />
              </label>
            ))}
            <label className="min-w-0 text-xs text-muted">
              {t("priceColumn")}
              <input
                aria-label={t("unitPrice")}
                inputMode="numeric"
                pattern="[0-9,]*"
                value={price ? Number(price).toLocaleString("en-US") : ""}
                onChange={(event) => {
                  setPrice(event.target.value.replace(/\D/g, "").slice(0, 8));
                  setError(null);
                }}
                onKeyDown={handleEnter}
                placeholder="₩"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className="focus-border-only mt-2 min-h-11 w-full min-w-0 rounded-lg border border-line-strong px-2 text-sm text-ink tabular-nums transition-colors focus:border-primary sm:px-3"
              />
            </label>
            <button
              type="button"
              disabled={!minimum || !price || tiers.length >= 99}
              onClick={addTier}
              className="min-h-11 rounded-lg border border-primary px-3 text-sm font-semibold text-primary disabled:border-line-strong disabled:text-muted/40 sm:px-5"
            >
              {t("addRow")}
            </button>
          </div>
          {validBounds && (
            <p role="status" className="text-xs font-medium text-primary-strong">
              {t("appliedGuests", {
                guests:
                  maximum === ""
                    ? t("openRangeLabel", { min: Number(minimum) })
                    : Number(minimum) === Number(maximum)
                      ? t("guestCount", { count: Number(minimum) })
                      : t("rangeLabel", { min: Number(minimum), max: Number(maximum) }),
              })}
            </p>
          )}
          {error && (
            <p id={errorId} role="alert" className="text-xs text-danger">
              {t(error)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function TierPayout({ draft, tier }: Readonly<{ draft: PricingDraft; tier?: PriceTierDraft }>) {
  const request = buildPricingRequest({
    ...draft,
    maxGuests: tier?.minGuests ?? "1",
    quantityPricingEnabled: Boolean(tier),
    priceTiers: tier ? [tier] : [],
    discountType: "none",
  });
  const signature = request ? JSON.stringify(request) : null;
  return (
    <PricingResult
      key={signature ?? "invalid"}
      signature={signature}
      compact
      amountOnly
      guestCount={tier ? Number(tier.minGuests) : 1}
    />
  );
}

export function ActivityPricingTable({ draft }: Readonly<{ draft: PricingDraft }>) {
  const request = buildPricingRequest(draft);
  const previewTiers = [
    { minGuests: "1", maxGuests: "1", unitPrice: draft.pricePerPerson },
    ...(draft.quantityPricingEnabled ? (draft.priceTiers ?? []) : []),
  ];
  // This is a pricing preview, not an availability query. Include every configured
  // tier even if its minimum exceeds the activity's current default capacity.
  const signature = request
    ? JSON.stringify({
        ...request,
        maxGuestCount: Math.max(
          request.maxGuestCount,
          ...previewTiers.map((tier) => Number(tier.minGuests)),
        ),
      })
    : null;
  return (
    <PricingResult
      key={signature ?? "invalid"}
      signature={signature}
      previewTiers={previewTiers}
      emptyMessage={
        draft.discountType === "limited" && (!draft.discountEndsAt || !draft.discountPercent)
          ? "previewPrompt"
          : "invalid"
      }
    />
  );
}

export function ActivityBasePayout({ price }: Readonly<{ price: string }>) {
  const valid = /^\d+$/.test(price) && Number(price) >= 15000 && Number(price) <= 99_999_999;
  const signature = valid
    ? JSON.stringify({
        price: Number(price),
        currency: "KRW",
        maxGuestCount: 1,
        discountPercent: null,
        discountEndDate: null,
        priceTiers: [],
      })
    : null;
  return <PricingResult key={signature ?? "invalid"} signature={signature} compact />;
}

function PricingResult({
  signature,
  compact = false,
  amountOnly = false,
  guestCount = 1,
  emptyMessage = "invalid",
  previewTiers = [],
}: Readonly<{
  signature: string | null;
  compact?: boolean;
  amountOnly?: boolean;
  guestCount?: number;
  emptyMessage?: "previewPrompt" | "invalid";
  previewTiers?: PriceTierDraft[];
}>) {
  const t = useTranslations("QuantityPricing");
  const locale = useLocale();
  const getError = useApiErrorMessage();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    signature: string;
    attempt: number;
    data?: ActivityPricingPreview;
    error?: Error;
  } | null>(null);
  const current = result?.signature === signature && result.attempt === attempt ? result : null;
  const selectedRow =
    current?.data?.rows.find((row) => row.guestCount === guestCount) ??
    (amountOnly ? undefined : current?.data?.rows[0]);
  useAuthQueryRedirect(current?.error ?? null);
  useEffect(() => {
    if (!signature) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = unwrapApiResult(
          await getActivityPricingPreview(JSON.parse(signature), controller.signal),
          "preview",
        );
        if (!controller.signal.aborted) setResult({ signature, attempt, data });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            signature,
            attempt,
            error: error instanceof Error ? error : new Error("Pricing preview failed"),
          });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signature, attempt]);
  if (amountOnly)
    return (
      <span aria-live="polite" aria-busy={Boolean(signature && !current)}>
        {current?.error ? (
          <button
            type="button"
            className="min-h-11 text-xs text-primary underline"
            title={t("error")}
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("retry")}
          </button>
        ) : selectedRow ? (
          formatKrw(selectedRow.estimatedGuidePayoutPerGuestKrw, locale)
        ) : (
          "—"
        )}
      </span>
    );
  if (compact)
    return (
      <div
        className="mt-2 min-h-6 text-center text-sm text-muted"
        aria-live="polite"
        aria-busy={Boolean(signature && !current)}
      >
        {current?.error ? (
          <>
            <span>{t("error")}</span>{" "}
            <button
              type="button"
              className="min-h-11 font-semibold text-primary underline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t("retry")}
            </button>
          </>
        ) : (
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>
              {t("basePayout", {
                amount: selectedRow
                  ? formatKrw(selectedRow.estimatedGuidePayoutAmountKrw, locale)
                  : "—",
              })}
            </span>
            {selectedRow && current?.data && Number.isFinite(current.data.commissionRate) && (
              <span className="text-xs">
                (
                {t("commissionDeducted", {
                  rate: new Intl.NumberFormat(locale, {
                    style: "percent",
                    maximumFractionDigits: 2,
                  }).format(current.data.commissionRate),
                })}
                )
              </span>
            )}
          </span>
        )}
      </div>
    );
  return (
    <section className="mt-6 space-y-3 border-t border-line-soft pt-6" aria-label={t("preview")}>
      <h3 className="font-display text-base font-bold text-ink">{t("preview")}</h3>
      {!signature ? (
        <p role="status" className="text-sm text-muted">
          {t(emptyMessage)}
        </p>
      ) : current?.error ? (
        <div role="alert" className="text-sm text-danger">
          <p>
            {current.error instanceof ApiClientError && current.error.code === "PAYMENT400_AMOUNT"
              ? t("invalidAmount")
              : getError(current.error, t("error"))}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="min-h-11 underline"
          >
            {t("retry")}
          </button>
        </div>
      ) : !current?.data ? (
        <p role="status" className="text-sm text-muted">
          {t("loading")}
        </p>
      ) : (
        <div>
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead className="bg-canvas-soft">
              <tr className="border-b border-line-strong text-left text-xs text-muted">
                <th scope="col" className="w-[21%] py-3 font-medium">
                  {t("guests")}
                </th>
                <th scope="col" className="py-3 pl-2 font-medium">
                  {t("priceColumn")}
                </th>
                <th scope="col" className="py-3 pl-2 font-medium">
                  {t("discountedPriceColumn")}
                </th>
                <th scope="col" className="py-3 pl-2 text-right font-medium">
                  {t("payoutColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {previewTiers.map((tier) => {
                const row = current.data?.rows.find(
                  (row) => row.guestCount === Number(tier.minGuests),
                );
                return (
                  <tr key={tier.minGuests} className="border-b border-line-soft">
                    <th scope="row" className="py-4 text-left font-medium">
                      {tier.maxGuests === ""
                        ? t("openRangeLabel", { min: Number(tier.minGuests) })
                        : tier.minGuests === tier.maxGuests
                          ? t("guestCount", { count: Number(tier.minGuests) })
                          : t("rangeLabel", {
                              min: Number(tier.minGuests),
                              max: Number(tier.maxGuests),
                            })}
                    </th>
                    <td className="py-4 pl-2 font-semibold tabular-nums">
                      {formatKrw(Number(tier.unitPrice), locale)}
                    </td>
                    <td className="py-4 pl-2 font-semibold text-primary tabular-nums">
                      {row ? formatKrw(row.finalUnitPriceKrw, locale) : "—"}
                    </td>
                    <td className="py-4 pl-2 text-right text-xs text-muted tabular-nums sm:text-sm">
                      {row ? formatKrw(row.estimatedGuidePayoutPerGuestKrw, locale) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
