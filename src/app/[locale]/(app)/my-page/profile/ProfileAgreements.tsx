"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { SignupAgreementNoticeDialog } from "@/components/auth/SignupAgreementNoticeDialog";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { updateMarketingConsent } from "@/lib/api/agreements";
import { isUnauthenticatedError, toApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import {
  SIGNUP_AGREEMENT_DOCUMENT_VERSION,
  type SignupAgreementDocuments,
} from "@/lib/auth/signup-agreement-notices";
import type { SignupAgreementType } from "@/lib/auth/types";
import { formatSeoulDate } from "@/lib/datetime";
import { myAgreementsQueryOptions } from "@/lib/query/agreements";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyAgreement, MyAgreements } from "@/types/agreement";

const labels = {
  ADULT_CONFIRMATION: "adultConfirmation",
  TERMS_OF_SERVICE: "termsOfService",
  PRIVACY_COLLECTION_USE: "privacyCollectionUse",
  BUDDY_OPERATION_TERMS: "buddyOperationTerms",
  BUDDY_COMMISSION_POLICY: "buddyCommissionPolicy",
  MARKETING_COMMUNICATION: "marketingCommunication",
} as const satisfies Record<SignupAgreementType, string>;

export function ProfileAgreements({
  userId,
  documents = {},
}: Readonly<{ userId: number; documents?: SignupAgreementDocuments }>) {
  const t = useTranslations("ProfileAgreements");
  const locale = useLocale() as Locale;
  const agreementT = useTranslations("Onboarding.agreements");
  const getErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const options = myAgreementsQueryOptions(userId);
  const query = useQuery(options);
  const [openAgreement, setOpenAgreement] = useState<MyAgreement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const requestLock = useRef(false);
  const titleId = useId();
  useEffect(() => {
    // Restore focus after the modal is removed and the page is no longer inert.
    if (!openAgreement) triggerRef.current?.focus();
  }, [openAgreement]);
  const mutation = useMutation({
    mutationFn: async (agreed: boolean) => {
      // Prevent a pre-mutation read from replacing the saved decision.
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      return unwrapApiResult(
        await updateMarketingConsent(
          agreed
            ? {
                agreed: true,
                version:
                  documents.MARKETING_COMMUNICATION?.version ?? SIGNUP_AGREEMENT_DOCUMENT_VERSION,
              }
            : { agreed: false },
        ),
        "agreement",
      );
    },
    onSuccess: async (agreement) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      // Do not recreate a removed account cache after logout/unmount.
      queryClient.setQueryData<MyAgreements>(options.queryKey, (previous) =>
        previous
          ? {
              ...previous,
              agreements: previous.agreements.map((item) =>
                item.type === agreement.type ? agreement : item,
              ),
            }
          : undefined,
      );
    },
    onError: async (error) => {
      // A failed response can still mean the write reached the server.
      if (!isUnauthenticatedError(error))
        await queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
  });
  useAuthQueryRedirect(query.error ?? mutation.error);

  const documentVersion =
    documents.MARKETING_COMMUNICATION?.version ?? SIGNUP_AGREEMENT_DOCUMENT_VERSION;
  const busy = mutation.isPending || query.isFetching;
  const marketing = query.data?.agreements.find((item) => item.type === "MARKETING_COMMUNICATION");
  const versionMismatch = marketing && marketing.currentVersion !== documentVersion;
  const versionError = toApiClientError(mutation.error).code === "USER400_MARKETING_VERSION";

  async function toggle(item: MyAgreement) {
    if (requestLock.current || busy || (item.agreed !== true && versionMismatch)) return;
    requestLock.current = true;
    try {
      await mutation.mutateAsync(item.agreed !== true);
    } catch {
      // The localized error and resynchronization are handled above.
    } finally {
      requestLock.current = false;
    }
  }

  function closeNotice() {
    setOpenAgreement(null);
  }

  return (
    <section
      aria-labelledby={titleId}
      className="w-full rounded-3xl border border-line-soft bg-white px-6 py-5 md:px-8 md:py-6"
    >
      <h2 id={titleId} className="font-display text-base font-bold text-ink">
        {t("title")}
      </h2>
      {query.isPending ? (
        <p role="status" className="mt-5 text-sm text-muted">
          {t("loading")}
        </p>
      ) : null}
      {query.isError ? (
        <div className="mt-5 flex items-start justify-between gap-3">
          <p role="alert" className="text-sm text-danger">
            {getErrorMessage(query.error, t("loadFailed"))}
          </p>
          <button
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            className="shrink-0 text-sm font-semibold text-primary-strong underline underline-offset-4 disabled:opacity-50"
          >
            {t("retry")}
          </button>
        </div>
      ) : null}
      {query.data && !query.isError ? (
        <ul className="mt-4 divide-y divide-line-soft">
          {query.data.agreements.map((item) => {
            const label = agreementT(`items.${labels[item.type]}`);
            const editable = item.type === "MARKETING_COMMUNICATION" && item.editable;
            const decisionDate =
              item.recorded && item.agreed === true && item.decidedAt
                ? formatSeoulDate(item.decidedAt, locale)
                : null;
            return (
              <li key={item.type} data-testid="agreement-row" className="py-3.5 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-muted">
                      {item.required ? agreementT("required") : agreementT("optional")}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        triggerRef.current = event.currentTarget;
                        setOpenAgreement(item);
                      }}
                      className="mt-1 flex items-start gap-1 text-left text-sm leading-5 font-medium text-ink transition-colors hover:text-primary-strong focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                    >
                      <span>{label}</span>
                      <ChevronRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                    </button>
                  </div>
                  {editable ? (
                    <button
                      type="button"
                      role="switch"
                      aria-label={label}
                      aria-checked={item.agreed === true}
                      disabled={busy || (item.agreed !== true && Boolean(versionMismatch))}
                      onClick={() => void toggle(item)}
                      className="group flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-10 items-center rounded-full px-0.5 transition-colors ${item.agreed === true ? "bg-primary group-hover:bg-primary-hover" : "bg-line-strong"}`}
                      >
                        <span
                          className={`size-5 rounded-full bg-white shadow-sm transition-transform ${item.agreed === true ? "translate-x-4" : "translate-x-0"}`}
                        />
                      </span>
                    </button>
                  ) : (
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-muted">
                      <span className="flex items-center gap-1 font-medium">
                        {item.recorded && item.agreed === true ? (
                          <CheckIcon aria-hidden className="size-3.5 shrink-0 text-primary" />
                        ) : null}
                        {!item.recorded || item.agreed === null
                          ? t("noRecord")
                          : item.agreed
                            ? t("agreed")
                            : t("notAgreed")}
                      </span>
                      {decisionDate ? (
                        <time
                          dateTime={item.decidedAt ?? undefined}
                          className="text-[11px] leading-4"
                        >
                          {decisionDate}
                        </time>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {versionMismatch || versionError ? (
        <p role="alert" className="mt-4 text-sm leading-5 text-primary-strong">
          {t("versionMismatch")}
        </p>
      ) : null}
      {mutation.isError && !versionError && !isUnauthenticatedError(mutation.error) ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {getErrorMessage(mutation.error, t("saveFailed"))}
        </p>
      ) : null}
      <p role="status" className="mt-3 text-xs text-primary-strong empty:hidden">
        {mutation.isPending ? t("saving") : mutation.isSuccess ? t("saved") : ""}
      </p>
      {openAgreement && query.data ? (
        <SignupAgreementNoticeDialog
          agreementType={openAgreement.type}
          userType={query.data.userType}
          title={`${t("currentDocument")} · ${agreementT(`items.${labels[openAgreement.type]}`)}`}
          document={documents[openAgreement.type]}
          versionNote={
            openAgreement.recorded && openAgreement.version
              ? t("recordedVersion", { version: openAgreement.version })
              : undefined
          }
          onClose={closeNotice}
        />
      ) : null}
    </section>
  );
}
