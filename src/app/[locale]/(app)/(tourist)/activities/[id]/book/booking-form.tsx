"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BookingPanel } from "@/components/layout/BookingPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  MinusIcon,
  PlusIcon,
  UserIcon,
} from "@/components/ui/icons";
import {
  AvailabilityCalendarDialog,
  formatSessionTimeRange,
} from "@/components/activity/AvailabilityCalendarDialog";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday } from "@/lib/datetime";
import { createApplication } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatKrw } from "@/lib/format";
import { isTossUserCancel, requestTossPayment } from "@/lib/payments/toss";
import { applicationKeys } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { Activity } from "@/types/activity";

const MAX_GUESTS = 8;

type BookingErrorKey = "scheduleRequired" | "paymentProcessFailed" | "paymentCancelled";

function validateBookingSession(sessionId: string): BookingErrorKey | null {
  return sessionId ? null : "scheduleRequired";
}

export function BookingForm({
  activity,
  initialSessionId,
}: Readonly<{ activity: Activity; initialSessionId?: string }>) {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("Booking");
  const getApiErrorMessage = useApiErrorMessage();
  const [sessionId, setSessionId] = useState(() => {
    if (
      initialSessionId &&
      activity.sessions.some((session) => session.id === initialSessionId && session.spotsLeft > 0)
    ) {
      return initialSessionId;
    }
    return activity.sessions[0]?.id ?? "";
  });
  const [guests, setGuests] = useState(2);
  const [agreed, setAgreed] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorKey, setErrorKey] = useState<BookingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: BookingErrorKey;
  } | null>(null);
  // 토스 결제창이 열려 있는 동안 제출 버튼을 잠근다
  const [paymentInFlight, setPaymentInFlight] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // 재시도 시에도 매번 신청을 새로 생성한다 — 백엔드가 기존 PENDING_PAYMENT 신청을 대체(SUPERSEDED)한다
  const createApplicationMutation = useMutation({
    mutationFn: async (request: Parameters<typeof createApplication>[0]) =>
      unwrapApiResult(await createApplication(request), "payment"),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.applications() }),
      ]);
    },
  });
  useAuthQueryRedirect(createApplicationMutation.error);
  const isSubmitting = createApplicationMutation.isPending || paymentInFlight;

  const subtotal = activity.price * guests;
  const total = subtotal;

  async function handleSubmitClick() {
    const validationError = validateBookingSession(sessionId);
    if (validationError) {
      setRequestFailure(null);
      setErrorKey(validationError);
      return;
    }
    setErrorKey(null);
    setRequestFailure(null);
    try {
      const payment = await createApplicationMutation.mutateAsync({
        activityScheduleId: Number(sessionId),
        guestCount: guests,
        specialRequest: specialRequest.trim() || undefined,
      });
      setPaymentInFlight(true);
      // 결제 인증이 끝나면 successUrl(/payments/success)로 리다이렉트되어 승인 API를 호출한다
      await requestTossPayment(payment, locale as Locale);
    } catch (error) {
      if (error instanceof UnauthenticatedQueryError) return;
      if (isTossUserCancel(error)) {
        setErrorKey("paymentCancelled");
      } else {
        setRequestFailure({ error, fallbackKey: "paymentProcessFailed" });
      }
    } finally {
      setPaymentInFlight(false);
    }
  }

  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }

  const selectedSession = activity.sessions.find((session) => session.id === sessionId) ?? null;
  const sessionTimeRange = selectedSession
    ? formatSessionTimeRange(selectedSession, activity.durationMinutes, locale as Locale)
    : "";
  const sessionDateLabel = selectedSession
    ? ((selectedSession.startAt
        ? formatSeoulDateWithWeekday(selectedSession.startAt, locale as Locale)
        : null) ?? selectedSession.dateLabel)
    : "";
  const sessionSummaryLabel = selectedSession ? `${sessionDateLabel} ${sessionTimeRange}` : "—";

  return (
    <>
      <PageContainer className="py-6 md:py-10">
        <main
          data-testid="booking-layout"
          className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        >
          <div className="mx-auto w-full max-w-xl divide-y divide-line-soft lg:mx-0">
            <section className="flex flex-col gap-3 pb-7">
              <h2 className="font-display text-base font-bold text-ink">{t("dateTimeHeading")}</h2>
              <button
                type="button"
                data-testid="date-select-box"
                aria-label={t("dateTime")}
                onClick={() => setCalendarOpen(true)}
                className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 text-left text-sm font-semibold text-ink transition-colors hover:border-primary"
              >
                <span className="truncate">{sessionSummaryLabel}</span>
                <CalendarDaysIcon className="size-5 shrink-0 text-primary" />
              </button>
              <span className="text-xs text-muted">{t("kstNotice")}</span>
            </section>

            <section className="flex flex-col gap-3 py-7">
              <h2 className="font-display text-base font-bold text-ink">{t("guestsHeading")}</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{t("guestCount")}</span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label={t("decreaseGuests")}
                    disabled={guests <= 1}
                    onClick={() => setGuests((count) => Math.max(1, count - 1))}
                    className="flex size-9 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="min-w-14 text-center font-display text-base font-semibold text-ink">
                    {t("guests", { count: guests })}
                  </span>
                  <button
                    type="button"
                    aria-label={t("increaseGuests")}
                    disabled={guests >= MAX_GUESTS}
                    onClick={() => setGuests((count) => Math.min(MAX_GUESTS, count + 1))}
                    className="flex size-9 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3 py-7">
              <h2 className="font-display text-base font-bold text-ink">{t("specialRequest")}</h2>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-muted">{t("specialRequestDescription")}</span>
                <textarea
                  rows={3}
                  placeholder={t("specialRequestPlaceholder")}
                  value={specialRequest}
                  onChange={(event) => setSpecialRequest(event.target.value)}
                  className="w-full resize-none rounded-xl border border-line-strong bg-canvas-soft px-4 py-3.5 text-sm text-ink transition-colors outline-none placeholder:text-muted/60 focus:border-primary"
                />
              </label>
            </section>

            <section className="flex flex-col gap-3 pt-7">
              <p className="text-sm leading-6 text-muted">
                {t.rich("refundPolicy", {
                  policy: (chunks) => (
                    <span className="group relative inline-block">
                      <button
                        type="button"
                        className="font-semibold text-ink underline decoration-primary/60 decoration-2 underline-offset-4 transition-colors hover:text-primary focus-visible:text-primary"
                      >
                        {chunks}
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-72 -translate-x-1/2 flex-col gap-2 rounded-xl border border-primary/30 bg-canvas-soft p-4 text-left text-xs leading-5 font-normal no-underline shadow-[0_12px_30px_rgba(61,45,43,0.14)] group-focus-within:flex group-hover:flex"
                      >
                        {(["full", "half", "none"] as const).map((rule) => (
                          <span key={rule} className="flex items-center justify-between gap-3">
                            <span className="text-muted">{t(`refundRules.${rule}.label`)}</span>
                            <span
                              className={`font-display font-bold ${
                                rule === "none" ? "text-ink" : "text-primary"
                              }`}
                            >
                              {t(`refundRules.${rule}.value`)}
                            </span>
                          </span>
                        ))}
                      </span>
                    </span>
                  ),
                })}
              </p>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="size-4.5 rounded accent-primary"
                />
                <span className="text-sm text-ink">{t("agreement")}</span>
              </label>
            </section>
          </div>

          <BookingPanel>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={activity.heroImageUrl}
                    alt={activity.title}
                    fill
                    loading="eager"
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="line-clamp-2 font-display text-base leading-6 font-bold text-ink">
                    {activity.title}
                  </h1>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <UserIcon className="size-3.5" />
                    {t("hostedBy", { name: activity.host.name })}
                  </p>
                </div>
              </div>

              <dl className="flex flex-col gap-3 border-t border-line-soft pt-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted">{t("dateTime")}</dt>
                  <dd className="text-right font-semibold text-ink">
                    {selectedSession ? (
                      <>
                        <span className="block">{sessionDateLabel}</span>
                        <span className="block text-xs font-medium text-muted">
                          {sessionTimeRange}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{t("guestCount")}</dt>
                  <dd className="font-semibold text-ink">{t("guests", { count: guests })}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted">{t("specialRequest")}</dt>
                  <dd
                    data-testid="summary-special-request"
                    className={`line-clamp-3 text-right text-xs leading-5 font-medium break-keep ${
                      specialRequest.trim() ? "text-ink" : "text-muted"
                    }`}
                  >
                    {specialRequest.trim() || "—"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 border-t border-line-soft pt-4 text-sm">
                <h2 className="font-display text-sm font-bold text-ink">{t("priceDetails")}</h2>
                <div className="flex items-center justify-between text-muted">
                  <span>
                    {t("subtotal", { price: formatKrw(activity.price, locale), count: guests })}
                  </span>
                  <span>{formatKrw(subtotal, locale)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-line-soft pt-4">
                <span className="font-display text-base font-bold text-ink">{t("totalLabel")}</span>
                <span className="font-display text-xl font-bold text-primary">
                  {formatKrw(total, locale)}
                </span>
              </div>
            </div>

            <div className="lg:pt-6">
              <BottomActionBar>
                <button
                  type="button"
                  disabled={!agreed || isSubmitting}
                  onClick={handleSubmitClick}
                  className="flex h-13 w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-transparent font-display text-base font-bold text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-on-primary disabled:opacity-40"
                >
                  {isSubmitting ? t("processing") : t("submit")}
                  <ArrowRightIcon className="size-4" />
                </button>
              </BottomActionBar>
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {errorMessage}
              </p>
            ) : null}
          </BookingPanel>
        </main>
      </PageContainer>

      {calendarOpen ? (
        <AvailabilityCalendarDialog
          sessions={activity.sessions}
          selectedSessionId={sessionId || null}
          durationMinutes={activity.durationMinutes}
          onSelectSession={(nextSessionId) => {
            setSessionId(nextSessionId);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}
    </>
  );
}
