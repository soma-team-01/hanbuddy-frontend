"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getReferralNotice, submitReferralApplication } from "@/lib/api/referral";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { activityKeys } from "@/lib/query/activities";
import { applicationKeys } from "@/lib/query/applications";
import { useBookableSessions } from "@/lib/use-bookable-sessions";
import type { Activity } from "@/types/activity";

export function ReferralBookingForm({
  activity,
  initialSessionId,
}: {
  activity: Activity;
  initialSessionId?: string;
}) {
  const t = useTranslations("Referral");
  const getError = useApiErrorMessage();
  const client = useQueryClient();
  const sessions = useBookableSessions(activity.sessions);
  const [selectedId, setSelectedId] = useState(initialSessionId ?? "");
  const [count, setCount] = useState(1);
  const [agreedVersion, setAgreedVersion] = useState<string | null>(null);
  const [consentChanged, setConsentChanged] = useState(false);
  const lock = useRef(false);
  const notice = useQuery({
    queryKey: ["referral", "notice", activity.id],
    queryFn: async () => unwrapApiResult(await getReferralNotice(activity.id), "data"),
    staleTime: 0,
  });
  const selected = sessions.find((s) => s.id === selectedId);
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (
        !selected ||
        count < 1 ||
        count > Math.min(100, selected.spotsLeft) ||
        !notice.data ||
        agreedVersion !== notice.data.consentVersion
      )
        throw new Error(t("agreementRequired"));
      return unwrapApiResult(
        await submitReferralApplication(activity.id, {
          activityScheduleId: Number(selected.id),
          guestCount: count,
          partnerSharingAgreed: true,
          consentVersion: notice.data.consentVersion,
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
        setAgreedVersion(null);
        setConsentChanged(true);
        await notice.refetch();
      }
      await client.invalidateQueries({ queryKey: activityKeys.all() });
    },
  });
  useAuthQueryRedirect(mutation.error);
  const result = mutation.data;
  if (result)
    return (
      <PageContainer className="py-10">
        <section
          className="mx-auto max-w-xl rounded-2xl border border-line-soft p-6 md:p-8"
          role="status"
        >
          <h1 className="text-xl font-bold">
            {result.status === "CONFIRMED"
              ? t("success")
              : result.status === "CANCELLED"
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
    count <= Math.min(100, selected.spotsLeft) &&
    notice.data &&
    !notice.isFetching &&
    !notice.error &&
    agreedVersion === notice.data.consentVersion;
  return (
    <PageContainer className="py-5 md:py-8">
      <form
        className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-line-soft bg-white p-5 md:p-8"
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
        <div>
          <p className="text-xs font-semibold text-primary">{t("label")}</p>
          <h1 className="mt-2 text-xl font-bold">{activity.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{t("notice")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <label className="text-sm font-semibold">
            {t("schedule")}
            <select
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 font-normal focus:border-primary"
            >
              <option value="">{t("schedule")}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.dateLabel} · {s.timeLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {t("guests")}
            <input
              type="number"
              required
              min={1}
              max={selected ? Math.min(100, selected.spotsLeft) : 100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 min-h-11 w-full rounded-xl border border-line-strong px-3 font-normal focus:border-primary"
            />
          </label>
        </div>
        {!sessions.length && (
          <p role="status" className="text-sm text-muted">
            {t("unavailable")}
          </p>
        )}
        {notice.isPending ? (
          <p>{t("loading")}</p>
        ) : notice.error ? (
          <div role="alert">
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
          <div className="space-y-4 border-t border-line-soft pt-5">
            <p className="text-sm leading-6 text-muted">{notice.data.serviceNotice}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">{t("recipient")}</dt>
              <dd className="break-words">{notice.data.partnerName}</dd>
              <dt className="text-muted">{t("fields")}</dt>
              <dd className="break-words">{notice.data.sharedFields.join(", ")}</dd>
              <dt className="text-muted">{t("purpose")}</dt>
              <dd className="break-words">{notice.data.purpose}</dd>
            </dl>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={agreedVersion === notice.data.consentVersion}
                onChange={(e) => {
                  setAgreedVersion(e.target.checked ? notice.data!.consentVersion : null);
                  setConsentChanged(false);
                }}
              />
              {t("consent")}
            </label>
          </div>
        ) : null}
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
          className="min-h-12 w-full rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {mutation.isPending ? t("loading") : t("apply")}
        </button>
      </form>
    </PageContainer>
  );
}
