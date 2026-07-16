"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
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
import {
  captureApplicationPayment,
  continueApplicationPayment,
  createApplication,
} from "@/lib/api/applications";
import { formatCurrency, formatKrw } from "@/lib/format";
import { applicationKeys } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { Activity } from "@/types/activity";

const MAX_GUESTS = 8;

export function BookingForm({ activity }: Readonly<{ activity: Activity }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const tDateTime = useTranslations("DateTime");
  const [sessionId, setSessionId] = useState(activity.sessions[0]?.id ?? "");
  const [guests, setGuests] = useState(2);
  const [agreed, setAgreed] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
    if (!sessionId) {
      setErrorMessage("신청 가능한 일정을 선택해 주세요.");
      return;
    }
    setErrorMessage("");
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
    setErrorMessage("");
    if (preparedOrderId) {
      return { orderId: preparedOrderId };
    }
    const applicationId = applicationIdRef.current;
    if (applicationId === null) {
      throw new Error("결제할 신청 정보를 찾지 못했습니다.");
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
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "결제를 완료하지 못했습니다.",
      );
    }
  }

  function handlePayPalError(error: unknown) {
    if (error instanceof UnauthenticatedQueryError) return;
    setErrorMessage(
      error instanceof Error && error.message
        ? error.message
        : "결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  function handlePayPalCancel() {
    setErrorMessage("결제가 완료되지 않았습니다. My Applications에서 이어서 결제할 수 있습니다.");
  }

  function handleDialogClose() {
    setShowConfirm(false);
    // 신청은 이미 PENDING_PAYMENT로 생성됐으므로 My Applications에서 이어서 결제하도록 보낸다
    if (applicationIdRef.current !== null && !capturePaymentMutation.isSuccess) {
      router.replace("/applications");
    }
  }

  return (
    <PayPalPaymentProvider>
      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <section className="overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="relative h-48 w-full overflow-hidden rounded-xl">
            <Image
              src={activity.heroImageUrl}
              alt={activity.title}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-forest">{activity.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
            <UserIcon className="size-4" />
            with {activity.host.name}
          </p>
          {activity.rating !== undefined ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
              <StarIcon className="size-4" />
              <span className="font-display font-semibold">{activity.rating.toFixed(1)}</span>
              {activity.reviewCount !== undefined ? (
                <span className="text-ink-soft">({activity.reviewCount} reviews)</span>
              ) : null}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
            When are you going?
          </h2>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Datetime</span>
            <span className="text-xs text-ink-soft">{tDateTime("kstNotice")}</span>
            <span className="relative">
              <select
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
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
          <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
            How many people?
          </h2>
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <span className="text-base text-ink">Number of guests</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Decrease guests"
                disabled={guests <= 1}
                onClick={() => setGuests((count) => Math.max(1, count - 1))}
                className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:bg-chip disabled:opacity-40"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="w-5 text-center font-display text-base font-semibold text-ink">
                {guests}
              </span>
              <button
                type="button"
                aria-label="Increase guests"
                disabled={guests >= MAX_GUESTS}
                onClick={() => setGuests((count) => Math.min(MAX_GUESTS, count + 1))}
                className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:bg-chip disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
            Special Requests
          </h2>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">
              Dietary restrictions, accessibility needs, etc. (Optional)
            </span>
            <textarea
              rows={3}
              placeholder="Let your guide know..."
              value={specialRequest}
              onChange={(event) => setSpecialRequest(event.target.value)}
              className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-chip p-5">
          <h2 className="text-base font-medium text-ink">Price details</h2>
          <div className="flex items-center justify-between text-sm text-ink">
            <span>
              {formatKrw(activity.price, locale)} x {guests} guests
            </span>
            <span>{formatKrw(subtotal, locale)}</span>
          </div>
          <div className="h-px w-full bg-line" aria-hidden />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Total (KRW)</span>
            <span className="font-display text-2xl font-bold text-forest">
              {formatKrw(total, locale)}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-base text-ink">Refunds are only available until a day before.</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="size-5 rounded accent-forest"
            />
            <span className="text-base text-ink">I agree to the terms above.</span>
          </label>
        </section>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </p>
        )}

        <BottomActionBar>
          <button
            type="button"
            disabled={!agreed || isSubmitting}
            onClick={handleSubmitClick}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest font-display text-base font-semibold text-cream transition-colors enabled:hover:bg-forest-soft disabled:opacity-40"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
            <ArrowRightIcon className="size-4" />
          </button>
        </BottomActionBar>

        {showConfirm && (
          <ConfirmDialog
            title="Choose a payment method"
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
            <p className="truncate text-sm text-ink-soft">
              {activity.title} ·{" "}
              {selectedSession ? `${selectedSession.dateLabel} ${selectedSession.timeLabel}` : "-"}{" "}
              · {guests} guests
            </p>
            <dl className="mt-3 flex flex-col gap-3 rounded-xl bg-chip p-4 text-sm text-ink">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-soft">Total application amount</dt>
                <dd className="font-display font-semibold">{formatKrw(total, locale)}</dd>
              </div>
              {paymentCharge ? (
                <div className="flex items-center justify-between gap-4 text-forest">
                  <dt>PayPal charge</dt>
                  <dd className="font-display text-base font-semibold">
                    {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-ink-soft">PayPal payments are processed in USD.</p>
            {errorMessage && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {errorMessage}
              </p>
            )}
          </ConfirmDialog>
        )}
      </main>
    </PayPalPaymentProvider>
  );
}
