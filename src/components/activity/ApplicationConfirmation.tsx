"use client";

import Image from "next/image";
import { ApprovalDeadline } from "@/components/booking/ApprovalDeadline";
import { PayPalAuthorizationNotice } from "@/components/payment/PayPalAuthorizationNotice";
import { isPayPalUncaptured } from "@/lib/payments/paypal-authorization";
import { useLocale, useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { CheckCircleIcon, UserIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { formatSeoulDateTime } from "@/lib/datetime";
import { formatCurrency, formatKrw } from "@/lib/format";
import type { ApplicationResponse } from "@/types/application";

/** 금액과 통화를 항상 같은 결제 기록에서 선택해 서로 다른 통화가 섞이지 않게 한다. */
function getPaidPayment(application: ApplicationResponse) {
  if (application.providerPaymentAmount != null && application.providerPaymentCurrency != null) {
    return {
      amount: application.providerPaymentAmount,
      currency: application.providerPaymentCurrency,
    };
  }
  if (application.paymentAmount != null && application.paymentCurrency != null) {
    return {
      amount: application.paymentAmount,
      currency: application.paymentCurrency,
    };
  }
  return {
    amount: application.totalPrice,
    currency: application.currency,
  };
}

export function ApplicationConfirmation({
  application,
  referralServicePrice,
}: Readonly<{ application: ApplicationResponse; referralServicePrice?: number }>) {
  const isReferral = referralServicePrice !== undefined;
  const awaitingApproval = application.status === "PENDING_APPROVAL";
  const authorization = useTranslations("PayPalAuthorization");
  const uncaptured = isPayPalUncaptured(application);
  const captureProcessing = application.paypalAuthorization?.state === "CAPTURE_REQUESTED";
  const approval = useTranslations("Approval");
  const referral = useTranslations("Referral");
  const explore = useTranslations("Explore");
  const locale = useLocale();
  const t = useTranslations("Payment");
  const tBooking = useTranslations("Booking");
  const pricingT = useTranslations("QuantityPricing");
  const tErrors = useTranslations("Errors");
  const scheduleLabel =
    formatSeoulDateTime(application.startAt, locale) ?? tErrors("dateTimeUnavailable");
  const paidPayment = getPaidPayment(application);
  // 실제 결제 통화로 표기한다 — 원화가 아닌 결제를 ₩로 적으면 금액을 잘못 읽는다
  const originalTotalPrice = application.originalTotalPrice ?? application.totalPrice;
  const discountAmount =
    application.discountAmount ?? Math.max(0, originalTotalPrice - application.totalPrice);
  const hasDiscount = discountAmount > 0;

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-6 md:py-16">
      <main
        data-testid={isReferral ? "referral-result" : "payment-result"}
        className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 shadow-[0_18px_45px_rgba(61,45,43,0.1)] max-md:p-3.5 md:p-10"
      >
        <section className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full border border-success/40 text-success max-md:size-11">
            <CheckCircleIcon className="size-8 max-md:size-6" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink max-md:mt-3 max-md:text-base max-md:leading-6 max-md:tracking-tight md:text-3xl">
            {uncaptured
              ? authorization(captureProcessing ? "checking" : "received")
              : awaitingApproval
                ? approval(isReferral ? "applied" : "paid")
                : isReferral
                  ? referral("success")
                  : t("complete")}
          </h1>
          <p className="mt-2 text-sm text-muted max-md:mt-1.5 max-md:text-xs max-md:leading-5">
            {uncaptured
              ? authorization(captureProcessing ? "captureProcessing" : "authorized")
              : awaitingApproval
                ? approval("waiting")
                : isReferral
                  ? referral("notice")
                  : t("confirmed")}
          </p>
          {awaitingApproval && <ApprovalDeadline expiresAt={application.approvalExpiresAt} />}
        </section>

        {/* 예약 화면의 요약 패널과 같은 구성 — 배경을 채우지 않고 구분선으로만 나눈다 */}
        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-line-soft p-5 max-md:mt-5 max-md:gap-3 max-md:p-3">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-panel max-md:size-12">
              <Image
                src={getActivityThumbnail(application.thumbnailImageUrl)}
                alt={application.activityTitle}
                fill
                sizes="(max-width: 767px) 48px, 64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2
                title={application.activityTitle}
                className="line-clamp-2 font-display text-base leading-6 font-bold text-ink max-md:line-clamp-1 max-md:text-sm max-md:leading-5"
              >
                {application.activityTitle}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <UserIcon className="size-3.5 shrink-0" />
                <span className="max-md:truncate">
                  {tBooking("hostedBy", { name: application.buddyName })}
                </span>
              </p>
            </div>
          </div>

          <dl className="flex flex-col gap-3 border-t border-line-soft pt-4 text-sm max-md:gap-2.5 max-md:pt-3 max-md:text-xs">
            <div className="flex items-start justify-between gap-4 max-md:flex-wrap max-md:gap-x-2 max-md:gap-y-1">
              <dt className="shrink-0 text-muted">{tBooking("dateTime")}</dt>
              <dd className="text-right font-semibold text-ink max-md:ml-auto max-md:whitespace-nowrap">
                {scheduleLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 max-md:flex-wrap max-md:gap-x-2 max-md:gap-y-1">
              <dt className="text-muted max-md:whitespace-nowrap">{tBooking("guestCount")}</dt>
              <dd className="font-semibold text-ink max-md:ml-auto max-md:whitespace-nowrap">
                {tBooking("guests", { count: application.guestCount })}
              </dd>
            </div>
            {application.specialRequest ? (
              <div className="flex items-start justify-between gap-4 max-md:gap-2">
                <dt className="shrink-0 text-muted">{tBooking("specialRequest")}</dt>
                <dd className="line-clamp-3 min-w-0 text-right text-xs leading-5 font-medium break-words text-ink md:break-keep">
                  {application.specialRequest}
                </dd>
              </div>
            ) : null}
          </dl>

          {isReferral ? (
            <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-4 max-md:pt-3">
              <span className="font-display text-base font-bold text-ink max-md:text-sm">
                {referral("servicePrice")}
              </span>
              <div className="text-right">
                <p className="font-display text-xl font-bold text-primary max-md:text-lg">
                  {referralServicePrice === 0
                    ? referral("free")
                    : `${formatKrw(referralServicePrice, locale)}~`}
                </p>
                {referralServicePrice > 0 && (
                  <p className="text-xs text-muted">{explore("perPersonLabel")}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-t border-line-soft pt-4 text-sm max-md:pt-3 max-md:text-xs">
                <span className="text-muted">
                  {hasDiscount ? t("originalAmountLabel") : t("totalLabel")}
                </span>
                <span className="font-semibold text-ink">
                  {formatKrw(originalTotalPrice, locale)}
                </span>
              </div>

              {hasDiscount &&
              ((application.quantityDiscountAmount ?? 0) > 0 ||
                (application.periodDiscountAmount ?? 0) > 0) ? (
                <>
                  {(application.quantityDiscountAmount ?? 0) > 0 && (
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-primary max-md:text-xs">
                      <span>{pricingT("quantityDiscount")}</span>
                      <span>-{formatKrw(application.quantityDiscountAmount!, locale)}</span>
                    </div>
                  )}
                  {(application.periodDiscountAmount ?? 0) > 0 && (
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-primary max-md:text-xs">
                      <span>{pricingT("periodDiscount")}</span>
                      <span>-{formatKrw(application.periodDiscountAmount!, locale)}</span>
                    </div>
                  )}
                </>
              ) : hasDiscount ? (
                <div className="flex items-center justify-between text-sm font-semibold text-primary max-md:text-xs">
                  <span>
                    {application.discountPercent
                      ? t("discountLabel", { percent: application.discountPercent })
                      : t("discountAmountLabel")}
                  </span>
                  <span>-{formatKrw(discountAmount, locale)}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t border-line-soft pt-4 max-md:pt-3">
                <span className="font-display text-base font-bold text-ink max-md:text-sm">
                  {uncaptured ? authorization("heldAmount") : t("paidLabel")}
                </span>
                <span className="font-display text-xl font-bold text-primary max-md:text-lg">
                  {formatCurrency(paidPayment.amount, paidPayment.currency, locale)}
                </span>
              </div>
            </>
          )}
        </section>
        {application.paypalAuthorization && !awaitingApproval && (
          <PayPalAuthorizationNotice application={application} />
        )}
        <div data-testid="confirmation-actions" className="mt-5 lg:mt-6">
          <div className="flex w-full flex-col gap-2">
            <Link
              href="/applications"
              className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary max-md:min-h-11 max-md:px-3 max-md:py-2.5 max-md:text-xs"
            >
              {t("viewApplications")}
            </Link>
            <Link
              href="/explore"
              className="flex w-full items-center justify-center rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary max-md:min-h-11 max-md:px-3 max-md:py-2.5 max-md:text-xs"
            >
              {t("exploreMore")}
            </Link>
          </div>
        </div>
      </main>
    </PageContainer>
  );
}
