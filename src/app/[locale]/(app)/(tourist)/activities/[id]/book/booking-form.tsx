"use client";

import Image from "next/image";
import { SessionWeatherSummary } from "@/components/activity/SessionWeatherSummary";
import { useBeginCheckout } from "@/components/analytics/use-begin-checkout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BookingPanel } from "@/components/layout/BookingPanel";
import { ApprovalNotice } from "@/components/booking/ApprovalNotice";
import { PageContainer } from "@/components/layout/PageContainer";
import { RefundPolicyAgreement, RefundPolicyNotice } from "@/components/booking/RefundPolicyNotice";
import { PayPalCheckoutButton } from "@/components/payment/PayPalCheckoutDialog";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiClientError } from "@/lib/api/errors";
import { CalendarDaysIcon, MinusIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import {
  AvailabilityCalendarDialog,
  formatSessionTimeRange,
} from "@/components/activity/AvailabilityCalendarDialog";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday } from "@/lib/datetime";
import { createApplication, getApplicationConflicts } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatDisplayCurrency, formatKrw } from "@/lib/format";
import { isTossUserCancel, requestTossPayment } from "@/lib/payments/toss";
import {
  isPaymentProviderVisible,
  PAYMENT_PROVIDER_MODE,
  type PaymentProviderMode,
} from "@/lib/payment-provider-visibility";
import {
  activityKeys,
  touristActivityQueryOptions,
  activityPriceQuoteQueryOptions,
} from "@/lib/query/activities";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { isBookingOpen, isBookableSession } from "@/lib/activity-booking-window";
import { useBookableSessions } from "@/lib/use-bookable-sessions";
import { applicationKeys } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { Activity, ActivityWeatherResult } from "@/types/activity";
import { getContentLanguage } from "@/lib/content-language";
import type {
  ApplicationConflictItemResponse,
  ApplicationConflictType,
  CreateApplicationRequest,
  PaymentProvider,
  PaymentReadyResponse,
} from "@/types/application";
import type { PolicyDocumentData } from "@/types/policy";
import { BookingConflictDialog } from "./booking-conflict-dialog";
import { AlternativePaymentDialog } from "@/components/booking/AlternativePaymentDialog";

const MAX_GUESTS = 100;

type BookingErrorKey =
  | "scheduleRequired"
  | "paymentProcessFailed"
  | "paymentCancelled"
  | "paymentAmountChanged"
  | "conflictCheckFailed";

interface ConflictDialogState {
  type: ApplicationConflictType;
  item?: ApplicationConflictItemResponse;
  blocking: boolean;
  paymentProvider: PaymentProvider;
}

function validateBookingSession(sessionId: string): BookingErrorKey | null {
  return sessionId ? null : "scheduleRequired";
}

export function BookingForm({
  activity,
  weather,
  initialSessionId,
  initialGuestCount = 1,
  payPalPricePending = false,
  payPalUnitPriceUsd,
  refundPolicyDocument,
  paymentProviderMode = PAYMENT_PROVIDER_MODE,
}: Readonly<{
  activity: Activity;
  weather?: ActivityWeatherResult;
  initialSessionId?: string;
  initialGuestCount?: number;
  payPalPricePending?: boolean;
  payPalUnitPriceUsd?: number;
  refundPolicyDocument?: PolicyDocumentData;
  paymentProviderMode?: PaymentProviderMode;
}>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const contentLanguage = getContentLanguage(locale);
  const t = useTranslations("Booking");
  const pricingT = useTranslations("QuantityPricing");
  const inquiryT = useTranslations("AlternativePayment");
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const getApiErrorMessage = useApiErrorMessage();
  const bookableSessions = useBookableSessions(activity.sessions);
  const [checkingSchedule, setCheckingSchedule] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    if (
      initialSessionId &&
      activity.sessions.some(
        (session) => session.id === initialSessionId && isBookableSession(session),
      )
    ) {
      return initialSessionId;
    }
    return initialSessionId
      ? ""
      : (activity.sessions.find((session) => isBookableSession(session))?.id ?? "");
  });
  const [guests, setGuests] = useState(() => {
    const capacity =
      activity.sessions.find((session) => session.id === sessionId)?.spotsLeft ?? MAX_GUESTS;
    return Number.isInteger(initialGuestCount) &&
      initialGuestCount >= 1 &&
      initialGuestCount <= MAX_GUESTS
      ? Math.max(1, Math.min(initialGuestCount, capacity))
      : 1;
  });
  /** 마감이 확인된 일정은 선택과 URL에서 함께 지워, 다시 마운트돼도 같은 일정이 선택되지 않게 한다. */
  function clearClosedSchedule() {
    setSessionId("");
    const url = new URL(window.location.href);
    if (!url.searchParams.has("scheduleId")) return;
    url.searchParams.delete("scheduleId");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  // 언어 전환은 쿼리를 보존한다. 최신 선택을 URL에 동기화해 폼이 다시 마운트되어도 복원한다.
  // 요청한 일정이 예약 불가라 선택이 비어 있으면 원래 scheduleId를 그대로 둔다. 빈 값으로 덮으면
  // 다시 마운트될 때 손님이 고르지 않은 첫 예약 가능 날짜가 자동 선택된다.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (
      url.searchParams.get("guestCount") === String(guests) &&
      (!sessionId || url.searchParams.get("scheduleId") === sessionId)
    )
      return;
    url.searchParams.set("guestCount", String(guests));
    if (sessionId) url.searchParams.set("scheduleId", sessionId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [guests, sessionId]);
  const quoteQuery = useQuery(activityPriceQuoteQueryOptions(activity.id, guests));
  const quote =
    !quoteQuery.isFetching &&
    !quoteQuery.isError &&
    quoteQuery.data?.guestCount === guests &&
    String(quoteQuery.data.activityId) === activity.id
      ? quoteQuery.data
      : null;
  const quoteReady = Boolean(quote && quote.currency === "KRW" && quote.amount > 0);
  const [refundPolicyAgreed, setRefundPolicyAgreed] = useState(false);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorKey, setErrorKey] = useState<BookingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: BookingErrorKey;
  } | null>(null);
  // 외부 결제창이 열려 있는 동안 제출 버튼을 잠근다
  const [paymentInFlight, setPaymentInFlight] = useState(false);
  const [payPalPayment, setPayPalPayment] = useState<PaymentReadyResponse | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState | null>(null);
  const showTossPayment = isPaymentProviderVisible("TOSS", paymentProviderMode);
  const showPayPalPayment = isPaymentProviderVisible("PAYPAL", paymentProviderMode);
  const showProviderChoice = paymentProviderMode === "BOTH";
  // React Query 상태가 화면에 반영되기 전의 연속 클릭도 동기적으로 차단한다
  const submissionLockRef = useRef(false);
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const conflictCheckMutation = useMutation({
    mutationFn: async (activityScheduleId: number) =>
      unwrapApiResult(
        await getApplicationConflicts(activityScheduleId, contentLanguage),
        "conflicts",
      ),
  });
  // 사전 확인 뒤에도 생성 시점의 좌석·일정 충돌은 백엔드가 다시 검증한다
  const createApplicationMutation = useMutation({
    mutationFn: async ({
      request,
      paymentProvider,
    }: {
      request: CreateApplicationRequest;
      paymentProvider: PaymentProvider;
    }) =>
      unwrapApiResult(
        await createApplication(request, contentLanguage, paymentProvider),
        "payment",
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.applications() }),
        // 좌석을 선점했으므로 활동 상세의 잔여 좌석을 다시 불러온다
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });
  useAuthQueryRedirect(
    quoteQuery.error ?? conflictCheckMutation.error ?? createApplicationMutation.error,
  );
  const isSubmitting =
    checkingSchedule ||
    conflictCheckMutation.isPending ||
    createApplicationMutation.isPending ||
    paymentInFlight;

  const originalUnitPrice = quote?.originalUnitPrice ?? 0;
  const originalSubtotal = quote?.originalAmount ?? 0;
  const total = quote?.amount ?? 0;
  const discountAmount = quote?.discountAmount ?? 0;
  const hasDiscount = discountAmount > 0;
  const localeReferenceTotal =
    quoteReady &&
    activity.price > 0 &&
    activity.referenceCurrency &&
    activity.referencePrice !== undefined
      ? total * (activity.referencePrice / activity.price)
      : null;
  const payPalReferenceUnitPrice =
    payPalUnitPriceUsd ??
    (activity.referenceCurrency === "USD" ? activity.referencePrice : undefined);
  const estimatedPayPalTotal =
    quoteReady && activity.price > 0 && payPalReferenceUnitPrice !== undefined
      ? total * (payPalReferenceUnitPrice / activity.price)
      : null;
  const isPayPalPricePending =
    showPayPalPayment &&
    estimatedPayPalTotal === null &&
    (payPalPricePending || quoteQuery.isPending || quoteQuery.isFetching);
  const isPayPalPriceUnavailable =
    showPayPalPayment && estimatedPayPalTotal === null && !isPayPalPricePending;
  const tossPaymentLabel = showProviderChoice ? t("payWithToss") : t("payNow");
  let payPalPaymentLabel = t("payWithPayPal");
  if (isPayPalPricePending) {
    payPalPaymentLabel = t("paypalPriceLoading");
  } else if (estimatedPayPalTotal !== null) {
    payPalPaymentLabel = t("payWithPayPalAmount", {
      amount: formatDisplayCurrency(estimatedPayPalTotal, "USD", locale),
    });
  }

  function toBlockingDialog(
    error: unknown,
    paymentProvider: PaymentProvider,
  ): ConflictDialogState | null {
    if (!(error instanceof ApiClientError)) return null;
    if (error.code === "APPLICATION409_SAME_SCHEDULE") {
      return { type: "SAME_SCHEDULE", blocking: true, paymentProvider };
    }
    if (error.code === "APPLICATION409_TIME_CONFLICT") {
      return { type: "TIME_OVERLAP", blocking: true, paymentProvider };
    }
    return null;
  }

  async function createAndOpenPayment(
    request: CreateApplicationRequest,
    paymentProvider: PaymentProvider,
  ) {
    if (!quoteReady || !refundPolicyAgreed || !approvalAcknowledged) return;
    try {
      setCheckingSchedule(true);
      // Do not trust a cached calendar or the device clock alone when starting a new payment.
      const latest = await queryClient.fetchQuery({
        ...touristActivityQueryOptions(
          activity.id,
          contentLanguage,
          getDefaultDisplayCurrency(locale),
        ),
        staleTime: 0,
      });
      const schedule = latest.schedules.find(
        (item) => item.activityScheduleId === request.activityScheduleId,
      );
      if (!schedule || schedule.status !== "OPEN" || !isBookingOpen(schedule.startAt)) {
        clearClosedSchedule();
        throw new ApiClientError({
          code: "APPLICATION400_BOOKING_CLOSED",
          status: 400,
          details: null,
          backendMessage: null,
        });
      }
      if (schedule.remainingCapacity < request.guestCount) {
        // Keep the date selected so the guest can reduce their party size and retry.
        throw new ApiClientError({
          code: "APPLICATION400_CAPACITY_EXCEEDED",
          status: 400,
          details: null,
          backendMessage: null,
        });
      }
      const payment = await createApplicationMutation.mutateAsync({ request, paymentProvider });
      if (paymentProvider === "PAYPAL") {
        setPayPalPayment(payment);
        return;
      }
      if (payment.paymentCurrency !== "KRW" || payment.paymentAmount !== total) {
        setErrorKey("paymentAmountChanged");
        return;
      }
      setPaymentInFlight(true);
      // 결제 인증이 끝나면 successUrl(/payments/success)로 리다이렉트되어 승인 API를 호출한다
      await requestTossPayment(payment, locale as Locale);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "APPLICATION400_BOOKING_CLOSED") {
        clearClosedSchedule();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
          queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        ]);
      }
      if (error instanceof UnauthenticatedQueryError) return;
      const blockingDialog = toBlockingDialog(error, paymentProvider);
      if (blockingDialog) {
        setConflictDialog(blockingDialog);
      } else if (paymentProvider === "TOSS" && isTossUserCancel(error)) {
        setErrorKey("paymentCancelled");
      } else {
        setRequestFailure({ error, fallbackKey: "paymentProcessFailed" });
      }
    } finally {
      setCheckingSchedule(false);
      setPaymentInFlight(false);
    }
  }

  async function runWithSubmissionLock(action: () => Promise<void>) {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    try {
      await action();
    } finally {
      submissionLockRef.current = false;
    }
  }

  function handleSubmitClick(paymentProvider: PaymentProvider) {
    if (!quoteReady || !refundPolicyAgreed || !approvalAcknowledged) return;
    if (paymentProvider === "PAYPAL" && estimatedPayPalTotal === null) return;
    void runWithSubmissionLock(async () => {
      const validationError = validateBookingSession(
        bookableSessions.some(
          (session) =>
            session.id === sessionId && isBookableSession(session) && session.spotsLeft >= guests,
        )
          ? sessionId
          : "",
      );
      if (validationError) {
        setRequestFailure(null);
        setErrorKey(validationError);
        return;
      }
      setErrorKey(null);
      setRequestFailure(null);
      const request: CreateApplicationRequest = {
        activityScheduleId: Number(sessionId),
        guestCount: guests,
        specialRequest: specialRequest.trim() || undefined,
        refundPolicyAgreed,
      };
      try {
        const conflicts = await conflictCheckMutation.mutateAsync(Number(sessionId));
        const blockingItem = conflicts.conflicts[0];
        if (conflicts.blocking) {
          setConflictDialog({
            type: blockingItem?.type ?? "TIME_OVERLAP",
            item: blockingItem,
            blocking: true,
            paymentProvider,
          });
          return;
        }
        const warningItem = conflicts.sameDayWarnings[0];
        if (warningItem) {
          setConflictDialog({
            type: warningItem.type,
            item: warningItem,
            blocking: false,
            paymentProvider,
          });
          return;
        }
        await createAndOpenPayment(request, paymentProvider);
      } catch (error) {
        if (error instanceof UnauthenticatedQueryError) return;
        setRequestFailure({ error, fallbackKey: "conflictCheckFailed" });
      }
    });
  }

  function handleContinueApplication() {
    if (!refundPolicyAgreed || !approvalAcknowledged) return;
    void runWithSubmissionLock(async () => {
      const paymentProvider = conflictDialog?.paymentProvider ?? "TOSS";
      setConflictDialog(null);
      setErrorKey(null);
      setRequestFailure(null);
      await createAndOpenPayment(
        {
          activityScheduleId: Number(sessionId),
          guestCount: guests,
          specialRequest: specialRequest.trim() || undefined,
          refundPolicyAgreed,
        },
        paymentProvider,
      );
    });
  }

  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }
  // 결제 중인 신청 때문에 막힌 경우에는 어디서 해결하는지까지 알려준다
  const blockedByPendingPayment =
    requestFailure?.error instanceof ApiClientError &&
    requestFailure.error.code === "APPLICATION409_PAYMENT_PENDING";

  // 에러는 모바일 고정 바 안에 그려지므로, 새로 생길 때 포커스를 옮겨 사용자가 놓치지 않게 한다
  useEffect(() => {
    if (errorMessage) errorAlertRef.current?.focus();
  }, [errorMessage]);

  const selectedSession = bookableSessions.find((session) => session.id === sessionId) ?? null;
  const maxGuests = Math.min(MAX_GUESTS, selectedSession?.spotsLeft ?? 0);
  useBeginCheckout(
    Number(activity.id),
    Boolean(
      selectedSession &&
      quoteReady &&
      selectedSession.spotsLeft >= guests &&
      (showTossPayment ||
        (showPayPalPayment &&
          estimatedPayPalTotal !== null &&
          !isPayPalPricePending &&
          !isPayPalPriceUnavailable)) &&
      !requestFailure &&
      !errorKey,
    ),
  );
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
      <PageContainer className="py-3 md:py-4">
        {/* 왼쪽 칸이 남는 폭까지 늘어나면 요약 패널과 사이가 크게 비므로 본문 폭에 맞춰 묶어 둔다 */}
        <main
          data-testid="booking-layout"
          className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_360px] lg:items-start lg:justify-center"
        >
          <div className="mx-auto w-full max-w-xl divide-y divide-line-soft lg:mx-0">
            <section className="flex flex-col gap-2.5 pb-4">
              <h2 className="font-display text-base font-bold text-ink">{t("dateTimeHeading")}</h2>
              <button
                type="button"
                data-testid="date-select-box"
                aria-label={t("dateTime")}
                onClick={() => setCalendarOpen(true)}
                className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:border-primary"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={selectedSession ? "text-ink" : "text-muted"}>
                    {sessionSummaryLabel}
                  </span>
                  <SessionWeatherSummary session={selectedSession} weather={weather} />
                </span>
                <CalendarDaysIcon className="size-5 shrink-0 text-primary" />
              </button>
              <span className="text-xs text-muted">{t("kstNotice")}</span>
              <p className="text-xs text-muted">{t("bookingWindowNotice")}</p>
            </section>

            <section className="flex flex-col gap-2.5 py-4">
              <h2 className="font-display text-base font-bold text-ink">{t("guestsHeading")}</h2>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm whitespace-nowrap text-ink">{t("guestCount")}</span>
                <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                  <button
                    type="button"
                    aria-label={t("decreaseGuests")}
                    disabled={guests <= 1}
                    onClick={() => setGuests((count) => Math.max(1, count - 1))}
                    className="flex size-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span
                    aria-live="polite"
                    role="status"
                    aria-label={t("guests", { count: guests })}
                    className="min-w-8 text-center text-xl font-semibold whitespace-nowrap text-ink tabular-nums"
                  >
                    {guests}
                  </span>
                  <button
                    type="button"
                    aria-label={t("increaseGuests")}
                    disabled={guests >= maxGuests}
                    onClick={() => setGuests((count) => Math.min(maxGuests, count + 1))}
                    className="flex size-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-2.5 py-4">
              <h2 className="font-display text-base font-bold text-ink">{t("specialRequest")}</h2>
              <label className="flex flex-col gap-2">
                <span className="text-xs text-muted">{t("specialRequestDescription")}</span>
                <textarea
                  rows={2}
                  placeholder={t("specialRequestPlaceholder")}
                  value={specialRequest}
                  onChange={(event) => setSpecialRequest(event.target.value)}
                  className="focus-border-only w-full resize-none rounded-xl border border-line-strong bg-canvas-soft px-4 py-3.5 text-base text-ink transition-colors placeholder:text-muted/60 focus:border-primary"
                />
              </label>
            </section>

            <div className="pt-4">
              <RefundPolicyNotice
                document={refundPolicyDocument}
                idPrefix="booking-refund-policy"
              />
            </div>
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
                  <dt className="text-sm whitespace-nowrap text-ink">{t("guestCount")}</dt>
                  <dd className="shrink-0 font-semibold whitespace-nowrap text-ink">
                    {t("guests", { count: guests })}
                  </dd>
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

              {!quoteReady ? (
                <div
                  className="border-t border-line-soft pt-4 text-sm"
                  role={quoteQuery.isError ? "alert" : "status"}
                >
                  <p className={quoteQuery.isError ? "text-danger" : "text-muted"}>
                    {quoteQuery.isError
                      ? getApiErrorMessage(quoteQuery.error, pricingT("quoteError"))
                      : pricingT("loading")}
                  </p>
                  {quoteQuery.isError && (
                    <button
                      type="button"
                      onClick={() => void quoteQuery.refetch()}
                      className="min-h-11 text-primary underline"
                    >
                      {pricingT("retry")}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 border-t border-line-soft pt-4 text-sm">
                    <h2 className="font-display text-sm font-bold text-ink">{t("priceDetails")}</h2>
                    <div className="flex items-center justify-between text-muted">
                      <span>
                        {t("subtotal", {
                          price: formatKrw(originalUnitPrice, locale),
                          count: guests,
                        })}
                      </span>
                      <span className={hasDiscount ? "line-through" : undefined}>
                        {formatKrw(originalSubtotal, locale)}
                      </span>
                    </div>
                    {hasDiscount &&
                    quote &&
                    (quote.quantityDiscountAmount > 0 || quote.periodDiscountAmount > 0) ? (
                      <>
                        {quote.quantityDiscountAmount > 0 && (
                          <div className="flex items-center justify-between gap-3 font-semibold text-primary">
                            <span>{pricingT("quantityDiscount")}</span>
                            <span>-{formatKrw(quote.quantityDiscountAmount, locale)}</span>
                          </div>
                        )}
                        {quote.periodDiscountAmount > 0 && (
                          <div className="flex items-center justify-between gap-3 font-semibold text-primary">
                            <span>
                              {pricingT("periodDiscount")}
                              {quote.discountPercent ? ` (${quote.discountPercent}%)` : ""}
                            </span>
                            <span>-{formatKrw(quote.periodDiscountAmount, locale)}</span>
                          </div>
                        )}
                      </>
                    ) : hasDiscount ? (
                      <div className="flex items-center justify-between font-semibold text-primary">
                        <span>
                          {quote?.discountPercent
                            ? t("discount", { percent: quote.discountPercent })
                            : t("discountAmount")}
                        </span>
                        <span>-{formatKrw(discountAmount, locale)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between border-t border-line-soft pt-4">
                    <span className="font-display text-base font-bold text-ink">
                      {t("totalLabel")}
                    </span>
                    <div className="flex flex-col items-end gap-0.5">
                      {localeReferenceTotal !== null && activity.referenceCurrency ? (
                        <span className="text-xs font-medium text-muted">
                          ≈{" "}
                          {formatDisplayCurrency(
                            localeReferenceTotal,
                            activity.referenceCurrency,
                            locale,
                          )}
                        </span>
                      ) : null}
                      <span className="font-display text-xl font-bold text-primary">
                        {formatKrw(total, locale)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="lg:pt-6">
              <BottomActionBar compact>
                <div className="flex w-full flex-col gap-1 lg:gap-2">
                  {errorMessage ? (
                    <div
                      ref={errorAlertRef}
                      role="alert"
                      tabIndex={-1}
                      className="rounded-xl border border-danger/30 bg-canvas-soft px-4 py-3 text-sm text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                      <p>{errorMessage}</p>
                      {blockedByPendingPayment ? (
                        <Link
                          href="/applications"
                          className="mt-2 inline-flex font-display text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                        >
                          {t("goToApplications")}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  <RefundPolicyAgreement
                    agreed={refundPolicyAgreed}
                    onAgreedChange={setRefundPolicyAgreed}
                    describedBy="booking-refund-policy-notice booking-refund-policy-summary"
                  />
                  <ApprovalNotice
                    agreed={approvalAcknowledged}
                    onAgreedChange={setApprovalAcknowledged}
                  />
                  <div
                    className={`grid w-full gap-2 ${showTossPayment && showPayPalPayment ? "md:grid-cols-2 lg:grid-cols-1" : ""}`}
                  >
                    {showTossPayment ? (
                      <button
                        type="button"
                        disabled={
                          !quoteReady ||
                          !refundPolicyAgreed ||
                          !approvalAcknowledged ||
                          isSubmitting ||
                          !selectedSession ||
                          guests > maxGuests
                        }
                        onClick={() => handleSubmitClick("TOSS")}
                        className={`flex h-11 w-full items-center justify-center rounded-full px-4 font-display text-sm font-bold transition-colors disabled:opacity-40 lg:h-13 ${
                          showProviderChoice
                            ? "bg-[#3182f6] text-white enabled:hover:bg-[#1b64da]"
                            : "bg-primary text-on-primary enabled:hover:bg-primary-hover"
                        }`}
                      >
                        {isSubmitting ? t("processing") : tossPaymentLabel}
                      </button>
                    ) : null}
                    {showPayPalPayment ? (
                      <div className="flex min-w-0 flex-col items-center gap-1.5">
                        {payPalPayment ? (
                          <PayPalCheckoutButton
                            payment={payPalPayment}
                            autoStart
                            onCancel={() => setPayPalPayment(null)}
                            onConfirmed={() => {
                              const applicationId = payPalPayment.application.applicationId;
                              setPayPalPayment(null);
                              void queryClient.invalidateQueries({
                                queryKey: applicationKeys.mine(),
                              });
                              router.push(`/payments/success?applicationId=${applicationId}`);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={
                              !quoteReady ||
                              !refundPolicyAgreed ||
                              !approvalAcknowledged ||
                              isSubmitting ||
                              estimatedPayPalTotal === null ||
                              !selectedSession ||
                              guests > maxGuests
                            }
                            onClick={() => handleSubmitClick("PAYPAL")}
                            className="flex h-11 w-full items-center justify-center rounded-full bg-[#ffc439] px-4 font-display text-sm font-bold text-[#111] transition-opacity enabled:hover:opacity-90 disabled:opacity-40 lg:h-13"
                          >
                            {isSubmitting ? t("processing") : payPalPaymentLabel}
                          </button>
                        )}
                        <p
                          role={isPayPalPriceUnavailable ? "alert" : undefined}
                          className={`text-center text-xs leading-4 ${
                            isPayPalPriceUnavailable ? "text-danger" : "text-muted"
                          }`}
                        >
                          {isPayPalPriceUnavailable
                            ? t("paypalPriceUnavailable")
                            : t("paypalCurrencyNotice")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  {showPayPalPayment && (
                    <button
                      type="button"
                      disabled={isSubmitting || payPalPayment !== null}
                      onClick={() => setInquiryOpen(true)}
                      className="min-h-11 px-2 text-center text-sm font-medium text-primary-strong underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary disabled:opacity-40"
                    >
                      {inquiryT("trigger")}
                    </button>
                  )}
                </div>
              </BottomActionBar>
            </div>
          </BookingPanel>
        </main>
      </PageContainer>

      {inquiryOpen && (
        <AlternativePaymentDialog
          booking={{
            activityTitle: activity.title,
            buddyName: activity.host.name,
            startAt: selectedSession?.startAt,
            dateLabel: selectedSession?.dateLabel,
            timeLabel: selectedSession?.timeLabel,
            participants: guests,
          }}
          onClose={() => setInquiryOpen(false)}
        />
      )}

      {calendarOpen ? (
        <AvailabilityCalendarDialog
          sessions={bookableSessions}
          selectedSessionId={sessionId || null}
          durationMinutes={activity.durationMinutes}
          onSelectSession={(nextSessionId) => {
            setSessionId(nextSessionId);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}

      {conflictDialog ? (
        <BookingConflictDialog
          type={conflictDialog.type}
          item={conflictDialog.item}
          blocking={conflictDialog.blocking}
          onClose={() => setConflictDialog(null)}
          onContinue={handleContinueApplication}
        />
      ) : null}
    </>
  );
}
