"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { BookingPanel } from "@/components/layout/BookingPanel";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CalendarDaysIcon, MinusIcon, PlusIcon, UserIcon } from "@/components/ui/icons";
import {
  AvailabilityCalendarDialog,
  formatSessionTimeRange,
} from "@/components/activity/AvailabilityCalendarDialog";
import { formatSeoulDateWithWeekday } from "@/lib/datetime";
import type { Locale } from "@/i18n/routing";
import { getReferralNotice, submitReferralApplication } from "@/lib/api/referral";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { activityKeys } from "@/lib/query/activities";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { getContentLanguage } from "@/lib/content-language";
import { useBookableSessions } from "@/lib/use-bookable-sessions";
import type { Activity } from "@/types/activity";
import { ReferralPrice } from "./ReferralPrice";
import { ApplicationConfirmation } from "@/components/activity/ApplicationConfirmation";

export function ReferralBookingForm({
  activity,
  initialSessionId,
}: {
  activity: Activity;
  initialSessionId?: string;
}) {
  const t = useTranslations("Referral");
  const booking = useTranslations("Booking");
  const detail = useTranslations("ActivityDetail");
  const locale = useLocale() as Locale;
  const getError = useApiErrorMessage();
  const client = useQueryClient();
  const sessions = useBookableSessions(activity.sessions);
  const [selectedId, setSelectedId] = useState(initialSessionId ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");
  const [agreedContext, setAgreedContext] = useState<string | null>(null);
  const [consentChanged, setConsentChanged] = useState(false);
  const lock = useRef(false);
  const notice = useQuery({
    queryKey: ["referral", "notice", activity.id],
    queryFn: async () => unwrapApiResult(await getReferralNotice(activity.id), "data"),
    staleTime: 0,
  });
  const history = useQuery({
    ...myApplicationsQueryOptions(getContentLanguage(locale)),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const previous = (history.data ?? []).filter(
    (item) =>
      item.activityType === "REFERRAL" &&
      String(item.activityId) === activity.id &&
      String(item.activityScheduleId) === selectedId,
  );
  const latestCancelled = previous
    .filter((item) => item.status === "CANCELLED")
    .reduce<(typeof previous)[number] | undefined>(
      (latest, item) => (!latest || item.applicationId > latest.applicationId ? item : latest),
      undefined,
    );
  const alreadyApplied = previous.some((item) => item.status !== "CANCELLED");
  const scheduleCancelled = previous.some(
    (item) => item.scheduleCancelled || item.cancellationReason === "BUDDY_CANCELLATION",
  );
  const reapplyFromApplicationId = latestCancelled?.applicationId;
  // Consent belongs to this exact intent, never to a silently refreshed cancellation record.
  const consentContext = JSON.stringify([
    activity.id,
    selectedId,
    reapplyFromApplicationId,
    notice.data?.consentVersion,
  ]);
  const historyReady =
    history.isSuccess && !history.isFetching && !alreadyApplied && !scheduleCancelled;
  const selected = sessions.find((s) => s.id === selectedId);
  const maxGuests = Math.min(100, selected?.spotsLeft ?? 0);
  const dateLabel = selected
    ? (selected.startAt && formatSeoulDateWithWeekday(selected.startAt, locale)) ||
      selected.dateLabel
    : "—";
  const timeLabel = selected
    ? formatSessionTimeRange(selected, activity.durationMinutes, locale)
    : "";
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (
        !selected ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > Math.min(100, selected.spotsLeft) ||
        !notice.data ||
        !historyReady ||
        agreedContext !== consentContext
      )
        throw new Error(t("agreementRequired"));
      return unwrapApiResult(
        await submitReferralApplication(activity.id, {
          activityScheduleId: Number(selected.id),
          guestCount: count,
          partnerSharingAgreed: true,
          consentVersion: notice.data.consentVersion,
          ...(reapplyFromApplicationId === undefined ? {} : { reapplyFromApplicationId }),
          ...(specialRequest.trim() ? { specialRequest: specialRequest.trim() } : {}),
        }),
        "data",
      );
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: activityKeys.all() }),
        client.invalidateQueries({ queryKey: applicationKeys.mine() }),
      ]);
    },
    onError: async (error) => {
      if (error instanceof ApiClientError && error.code === "APPLICATION400_REFERRAL_CONSENT") {
        setAgreedContext(null);
        setConsentChanged(true);
        await notice.refetch();
      }
      if (
        error instanceof ApiClientError &&
        (error.code === "APPLICATION409_REFERRAL_REAPPLICATION" ||
          error.code === "APPLICATION409_REFERRAL_EXISTS")
      ) {
        setAgreedContext(null);
        await notice.refetch();
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: activityKeys.all() }),
        client.invalidateQueries({ queryKey: applicationKeys.mine() }),
      ]);
    },
  });
  useAuthQueryRedirect(mutation.error ?? history.error ?? notice.error);
  const result = mutation.data;
  if (result?.status === "CONFIRMED" || result?.status === "PENDING_APPROVAL")
    return <ApplicationConfirmation application={result} referralServicePrice={activity.price} />;
  if (result)
    return (
      <PageContainer className="py-10">
        <section
          className="mx-auto max-w-xl rounded-2xl border border-line-soft p-6 md:p-8"
          role="status"
        >
          <h1 className="text-xl font-bold">
            {result.status === "CANCELLED"
              ? t("cancelled")
              : result.status === "COMPLETED"
                ? t("completed")
                : t("failed")}
          </h1>
          <p className="mt-3 text-sm text-muted">{t("notice")}</p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-primary px-5 font-bold text-primary"
            href="/applications"
          >
            {t("applications")}
          </Link>
        </section>
      </PageContainer>
    );
  const valid =
    selected &&
    Number.isInteger(count) &&
    count >= 1 &&
    specialRequest.length <= 1000 &&
    count <= Math.min(100, selected.spotsLeft) &&
    notice.data &&
    !notice.isFetching &&
    !notice.error &&
    historyReady &&
    agreedContext === consentContext;
  return (
    <PageContainer className="py-3 md:py-4">
      <form
        data-testid="booking-layout"
        className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_360px] lg:items-start lg:justify-center"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || lock.current) return;
          lock.current = true;
          try {
            await mutation.mutateAsync();
          } catch {
            /* shown inline */
          } finally {
            lock.current = false;
          }
        }}
      >
        <div className="mx-auto w-full max-w-xl min-w-0 divide-y divide-line-soft lg:mx-0">
          <section className="flex flex-col gap-2.5 pb-4">
            <h2 className="font-display text-base font-bold text-ink">
              {booking("dateTimeHeading")}
            </h2>
            <button
              type="button"
              aria-label={booking("dateTime")}
              onClick={() => setCalendarOpen(true)}
              disabled={!sessions.length || mutation.isPending}
              className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:border-primary disabled:opacity-40"
            >
              <span>
                {selected ? `${dateLabel} ${timeLabel}` : detail("selectDatePlaceholder")}
              </span>
              <CalendarDaysIcon className="size-5 shrink-0 text-primary" />
            </button>
            <p className="text-xs leading-5 text-muted">{booking("kstNotice")}</p>
            {!sessions.length && (
              <p role="status" className="text-sm text-muted">
                {t("unavailable")}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-2.5 py-4">
            <h2 className="font-display text-base font-bold text-ink">
              {booking("guestsHeading")}
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">{booking("guestCount")}</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={booking("decreaseGuests")}
                  disabled={count <= 1 || mutation.isPending}
                  onClick={() => setCount((value) => Math.max(1, value - 1))}
                  className="flex size-11 items-center justify-center rounded-full border border-line-soft text-ink hover:border-primary disabled:opacity-40"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span
                  className="min-w-14 text-center font-display text-base font-semibold"
                  aria-live="polite"
                >
                  {booking("guests", { count })}
                </span>
                <button
                  type="button"
                  aria-label={booking("increaseGuests")}
                  disabled={count >= maxGuests || mutation.isPending}
                  onClick={() => setCount((value) => Math.min(maxGuests, value + 1))}
                  className="flex size-11 items-center justify-center rounded-full border border-line-soft text-ink hover:border-primary disabled:opacity-40"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
            </div>
          </section>
          <section className="flex flex-col gap-2.5 py-4">
            <h2 className="font-display text-base font-bold text-ink">
              <label htmlFor="referral-special-request">{booking("specialRequest")}</label>
            </h2>
            <textarea
              id="referral-special-request"
              rows={3}
              maxLength={1000}
              placeholder={t("messagePlaceholder")}
              value={specialRequest}
              disabled={mutation.isPending}
              onChange={(event) => setSpecialRequest(event.target.value)}
              className="min-h-24 w-full resize-y rounded-xl border border-line-strong bg-canvas-soft px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:border-primary"
            />
          </section>
          <div className="py-4">
            <section
              className="rounded-xl border border-line-soft bg-canvas-soft px-3.5 py-3 shadow-[0_6px_18px_rgba(38,27,24,0.025)]"
              aria-labelledby="referral-sharing-title"
            >
              <h2 id="referral-sharing-title" className="font-display text-sm font-bold text-ink">
                {t("sharingTitle")}
              </h2>
              {notice.isPending ? (
                <p className="mt-2 text-[13px] leading-5 text-muted">{t("loading")}</p>
              ) : notice.error ? (
                <div role="alert" className="mt-2 text-[13px] leading-5">
                  <p>{t("failed")}</p>
                  <button
                    type="button"
                    onClick={() => void notice.refetch()}
                    className="mt-2 text-primary underline"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : notice.data ? (
                <div>
                  <p className="mt-2 rounded-md bg-primary-soft/65 px-3 py-2 text-[13px] leading-5 text-ink/80">
                    {notice.data.serviceNotice}
                  </p>
                  <dl
                    id="referral-sharing-details"
                    className="mt-1.5 divide-y divide-line-soft overflow-hidden rounded-md border border-line-soft text-[13px] leading-5"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-1.5">
                      <dt className="text-muted">{t("recipient")}</dt>
                      <dd className="break-words">{notice.data.partnerName}</dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-1.5">
                      <dt className="text-muted">{t("fields")}</dt>
                      <dd className="break-words">
                        {notice.data.sharedFields
                          .map((field) => {
                            const labels = {
                              name: t("sharedName"),
                              contactMethod: t("sharedContactMethod"),
                              contactCountryCode: t("sharedCountryCode"),
                              contactIdentifier: t("sharedContact"),
                            };
                            return labels[field as keyof typeof labels] ?? field;
                          })
                          .join(", ")}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-1.5">
                      <dt className="text-muted">{t("purpose")}</dt>
                      <dd className="break-words">{notice.data.purpose}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </section>
          </div>
        </div>
        <BookingPanel>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-3">
              {activity.heroImageUrl && (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={activity.heroImageUrl}
                    alt={activity.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="line-clamp-2 font-display text-base leading-6 font-bold text-ink">
                  {activity.title}
                </h1>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <UserIcon className="size-3.5 shrink-0" />
                  {booking("hostedBy", { name: activity.host.name })}
                </p>
              </div>
            </div>
            <section
              className="space-y-3 border-t border-line-soft pt-4"
              aria-labelledby="referral-summary-title"
            >
              <h2 id="referral-summary-title" className="font-display text-base font-bold">
                {t("summaryTitle")}
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted">{booking("dateTime")}</dt>
                  <dd className="text-right font-semibold">
                    <span className="block">{dateLabel}</span>
                    <span className="block text-xs font-medium text-muted">{timeLabel}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{booking("guestCount")}</dt>
                  <dd className="shrink-0 font-semibold">{booking("guests", { count })}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted">{booking("specialRequest")}</dt>
                  <dd className="min-w-0 text-right break-words whitespace-pre-wrap text-muted">
                    {specialRequest.trim() || "—"}
                  </dd>
                </div>
              </dl>
            </section>
            <div className="flex items-start justify-between gap-4 border-t border-line-soft pt-4">
              <span className="text-sm text-muted">{t("servicePrice")}</span>
              <ReferralPrice activity={activity} className="text-right" />
            </div>
          </div>
          <div className="pt-4 lg:pt-6">
            <BottomActionBar>
              <div className="flex w-full flex-col gap-3">
                {history.isPending ? (
                  <p role="status" className="text-sm text-muted">
                    {t("loading")}
                  </p>
                ) : history.error ? (
                  <div role="alert" className="text-sm text-danger">
                    <p>{getError(history.error, t("failed"))}</p>
                    <button
                      type="button"
                      onClick={() => void history.refetch()}
                      className="mt-2 text-primary underline"
                    >
                      {t("retry")}
                    </button>
                  </div>
                ) : alreadyApplied || scheduleCancelled ? (
                  <div role="status" className="text-sm text-muted">
                    <p>{t(scheduleCancelled ? "sessionCancelled" : "alreadyApplied")}</p>
                    <Link href="/applications" className="mt-2 inline-block text-primary underline">
                      {t("applications")}
                    </Link>
                  </div>
                ) : latestCancelled ? (
                  <p role="status" className="text-sm text-muted">
                    {t("reapplyNotice")}
                  </p>
                ) : null}
                {notice.data && (
                  <label className="flex items-start gap-3 text-sm leading-6 font-semibold">
                    <input
                      type="checkbox"
                      aria-describedby="referral-sharing-details"
                      className="mt-1 size-5 shrink-0 accent-primary"
                      disabled={notice.isFetching || !!notice.error || mutation.isPending}
                      checked={agreedContext === consentContext}
                      onChange={(e) => {
                        setAgreedContext(e.target.checked ? consentContext : null);
                        setConsentChanged(false);
                      }}
                    />
                    {t("consent")}
                  </label>
                )}
                {consentChanged ? (
                  <p role="alert" className="text-sm text-primary">
                    {t("refreshConsent")}
                  </p>
                ) : mutation.error ? (
                  <p role="alert" className="text-sm text-danger">
                    {getError(mutation.error, t("failed"))}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={!valid || mutation.isPending}
                  className="min-h-13 w-full rounded-full bg-primary px-4 font-display text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-40"
                >
                  {mutation.isPending ? t("loading") : t(latestCancelled ? "reapply" : "apply")}
                </button>
              </div>
            </BottomActionBar>
          </div>
        </BookingPanel>
      </form>
      {calendarOpen && (
        <AvailabilityCalendarDialog
          sessions={sessions}
          selectedSessionId={selectedId || null}
          durationMinutes={activity.durationMinutes}
          onSelectSession={(id) => {
            setSelectedId(id);
            setAgreedContext(null);
            setConsentChanged(false);
            mutation.reset();
            const session = sessions.find((item) => item.id === id);
            if (session) setCount((value) => Math.max(1, Math.min(value, session.spotsLeft, 100)));
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </PageContainer>
  );
}
