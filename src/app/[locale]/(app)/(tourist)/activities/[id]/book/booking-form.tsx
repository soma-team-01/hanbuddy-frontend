"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BookingPanel } from "@/components/layout/BookingPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PayPalPaymentButtons,
  PayPalPaymentProvider,
} from "@/components/payments/PayPalPaymentButton";
import { useRouter } from "@/i18n/navigation";
import {
  captureApplicationPayment,
  continueApplicationPayment,
  createApplication,
} from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatCurrency, formatKrw } from "@/lib/format";
import { applicationKeys } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { Activity } from "@/types/activity";

const MAX_GUESTS = 8;

type BookingErrorKey =
  | "scheduleRequired"
  | "applicationMissing"
  | "paymentFailed"
  | "paymentProcessFailed"
  | "paymentCancelled";

function validateBookingSession(sessionId: string): BookingErrorKey | null {
  return sessionId ? null : "scheduleRequired";
}

export function BookingForm({ activity }: Readonly<{ activity: Activity }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("Booking");
  const tPayment = useTranslations("Payment");
  const getApiErrorMessage = useApiErrorMessage();
  const [sessionId, setSessionId] = useState(activity.sessions[0]?.id ?? "");
  const [guests, setGuests] = useState(2);
  const [agreed, setAgreed] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorKey, setErrorKey] = useState<BookingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: BookingErrorKey;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentCharge, setPaymentCharge] = useState<{
    amount: number;
    currency: string;
  } | null>(null);
  const [preparedOrderId, setPreparedOrderId] = useState<string | null>(null);
  // PayPal 결제 재시도 시 신청을 중복 생성하지 않도록 첫 신청의 ID를 기억한다
  const applicationIdRef = useRef<number | null>(null);
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
  const continuePaymentMutation = useMutation({
    mutationFn: async (applicationId: number) =>
      unwrapApiResult(await continueApplicationPayment(applicationId), "payment"),
  });
  const capturePaymentMutation = useMutation({
    mutationFn: async ({
      applicationId,
      paypalOrderId,
    }: {
      applicationId: number;
      paypalOrderId: string;
    }) =>
      unwrapApiResult(await captureApplicationPayment(applicationId, paypalOrderId), "application"),
    onSuccess: async (application) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.applications() }),
      ]);
      router.replace(`/payments/success?applicationId=${application.applicationId}`);
    },
  });
  useAuthQueryRedirect(
    createApplicationMutation.error ??
      continuePaymentMutation.error ??
      capturePaymentMutation.error,
  );

  const isSubmitting =
    createApplicationMutation.isPending ||
    continuePaymentMutation.isPending ||
    capturePaymentMutation.isPending;

  const subtotal = activity.price * guests;
  const total = subtotal;
  const selectedSession = activity.sessions.find((session) => session.id === sessionId);

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
      applicationIdRef.current = payment.application.applicationId;
      setPreparedOrderId(payment.paypalOrderId);
      setPaymentCharge({ amount: payment.paymentAmount, currency: payment.paymentCurrency });
      setShowConfirm(true);
    } catch (error) {
      handlePayPalError(error);
    }
  }

  async function startPayPalOrder(): Promise<{ orderId: string }> {
    setErrorKey(null);
    setRequestFailure(null);
    if (preparedOrderId) {
      return { orderId: preparedOrderId };
    }
    const applicationId = applicationIdRef.current;
    if (applicationId === null) {
      setErrorKey("applicationMissing");
      throw new Error("applicationMissing");
    }
    const payment = await continuePaymentMutation.mutateAsync(applicationId);
    setPreparedOrderId(payment.paypalOrderId);
    setPaymentCharge({ amount: payment.paymentAmount, currency: payment.paymentCurrency });
    return { orderId: payment.paypalOrderId };
  }

  async function approvePayPalOrder({ orderId }: { orderId: string }) {
    const applicationId = applicationIdRef.current;
    if (applicationId === null) return;
    try {
      await capturePaymentMutation.mutateAsync({ applicationId, paypalOrderId: orderId });
    } catch (error) {
      setPreparedOrderId(null);
      if (error instanceof UnauthenticatedQueryError) return;
      setRequestFailure({ error, fallbackKey: "paymentFailed" });
    }
  }

  function handlePayPalError(error: unknown) {
    if (error instanceof UnauthenticatedQueryError) return;
    if (error instanceof Error && error.message === "applicationMissing") {
      setErrorKey("applicationMissing");
      return;
    }
    setRequestFailure({ error, fallbackKey: "paymentProcessFailed" });
  }

  function handlePayPalCancel() {
    setRequestFailure(null);
    setErrorKey("paymentCancelled");
  }

  function handleDialogClose() {
    setShowConfirm(false);
    // 신청은 이미 PENDING_PAYMENT로 생성됐으므로 My Applications에서 이어서 결제하도록 보낸다
    if (applicationIdRef.current !== null && !capturePaymentMutation.isSuccess) {
      router.replace("/applications");
    }
  }

  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }

  return (
    <PayPalPaymentProvider>
      <PageContainer className="py-6 md:py-10">
        <main
          data-testid="booking-layout"
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        >
          <div className="space-y-8">
            <section className="overflow-hidden rounded-2xl border border-line-soft bg-panel p-4 shadow-sm md:p-5">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image
                  src={activity.heroImageUrl}
                  alt={activity.title}
                  fill
                  sizes="(max-width: 1023px) 100vw, 760px"
                  className="object-cover"
                />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold text-ink md:text-3xl">
                {activity.title}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <UserIcon className="size-4" />
                {t("hostedBy", { name: activity.host.name })}
              </p>
              {activity.rating !== undefined ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
                  <StarIcon className="size-4" />
                  <span className="font-display font-semibold">{activity.rating.toFixed(1)}</span>
                  {activity.reviewCount !== undefined ? (
                    <span className="text-muted">
                      {t("reviewCount", { count: activity.reviewCount })}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="border-b border-line-soft pb-3 text-base font-semibold text-ink">
                {t("dateTimeHeading")}
              </h2>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-muted">{t("dateTime")}</span>
                <span className="text-xs text-muted">{t("kstNotice")}</span>
                <span className="relative">
                  <select
                    value={sessionId}
                    onChange={(event) => setSessionId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink"
                  >
                    {activity.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.dateLabel} {session.timeLabel}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" />
                </span>
              </label>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="border-b border-line-soft pb-3 text-base font-semibold text-ink">
                {t("guestsHeading")}
              </h2>
              <div className="flex items-center justify-between rounded-xl border border-line-soft bg-panel px-4 py-3">
                <span className="text-base text-ink">{t("guestCount")}</span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label={t("decreaseGuests")}
                    disabled={guests <= 1}
                    onClick={() => setGuests((count) => Math.max(1, count - 1))}
                    className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:bg-primary-soft disabled:opacity-40"
                  >
                    <MinusIcon className="size-4" />
                  </button>
                  <span className="min-w-16 text-center font-display text-base font-semibold text-ink">
                    {t("guests", { count: guests })}
                  </span>
                  <button
                    type="button"
                    aria-label={t("increaseGuests")}
                    disabled={guests >= MAX_GUESTS}
                    onClick={() => setGuests((count) => Math.min(MAX_GUESTS, count + 1))}
                    className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:bg-primary-soft disabled:opacity-40"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="border-b border-line-soft pb-3 text-base font-semibold text-ink">
                {t("specialRequest")}
              </h2>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-muted">{t("specialRequestDescription")}</span>
                <textarea
                  rows={3}
                  placeholder={t("specialRequestPlaceholder")}
                  value={specialRequest}
                  onChange={(event) => setSpecialRequest(event.target.value)}
                  className="w-full resize-none rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink placeholder:text-muted/70"
                />
              </label>
            </section>
          </div>
          <BookingPanel>
            <section className="flex flex-col gap-3 rounded-xl bg-panel-raised p-4">
              <h2 className="text-base font-medium text-ink">{t("priceDetails")}</h2>
              <div className="flex items-center justify-between text-sm text-ink">
                <span>
                  {t("subtotal", { price: formatKrw(activity.price, locale), count: guests })}
                </span>
                <span>{formatKrw(subtotal, locale)}</span>
              </div>
              <div className="h-px w-full bg-line-soft" aria-hidden />
              <div className="font-display text-2xl font-bold text-primary-strong">
                {t("totalKrw", { amount: formatKrw(total, locale) })}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-base text-ink">{t("refundPolicy")}</p>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="size-5 rounded accent-primary"
                />
                <span className="text-base text-ink">{t("agreement")}</span>
              </label>
            </section>

            {!showConfirm && errorMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {errorMessage}
              </p>
            ) : null}

            <BottomActionBar>
              <button
                type="button"
                disabled={!agreed || isSubmitting}
                onClick={handleSubmitClick}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-display text-base font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-40"
              >
                {isSubmitting ? t("processing") : t("submit")}
                <ArrowRightIcon className="size-4" />
              </button>
            </BottomActionBar>
          </BookingPanel>

          {showConfirm && (
            <ConfirmDialog
              title={t("choosePaymentMethod")}
              isPending={isSubmitting}
              onClose={handleDialogClose}
              confirmSlot={
                <PayPalPaymentButtons
                  createOrder={startPayPalOrder}
                  onApprove={approvePayPalOrder}
                  onCancel={handlePayPalCancel}
                  onError={handlePayPalError}
                  disabled={isSubmitting}
                />
              }
            >
              <p className="truncate text-sm text-muted">
                {t("paymentSummary", {
                  title: activity.title,
                  schedule: selectedSession
                    ? `${selectedSession.dateLabel} ${selectedSession.timeLabel}`
                    : "—",
                  count: guests,
                })}
              </p>
              <div className="mt-3 flex flex-col gap-3 rounded-xl bg-panel-raised p-4 text-sm text-ink">
                <div className="font-display font-semibold text-ink">
                  <p>{tPayment("totalApplicationAmount", { amount: formatKrw(total, locale) })}</p>
                </div>
                {paymentCharge ? (
                  <div className="font-display text-base font-semibold text-primary-strong">
                    <p>
                      {tPayment("paypalCharge", {
                        amount: formatCurrency(
                          paymentCharge.amount,
                          paymentCharge.currency,
                          locale,
                        ),
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-muted">{tPayment("paypalUsdNotice")}</p>
              {errorMessage ? (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
                >
                  {errorMessage}
                </p>
              ) : null}
            </ConfirmDialog>
          )}
        </main>
      </PageContainer>
    </PayPalPaymentProvider>
  );
}
