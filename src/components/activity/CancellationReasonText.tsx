"use client";

import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getContentLanguage, getContentLanguageTag } from "@/lib/content-language";
import { getCancellationTranslation } from "@/lib/api/cancellation-translation";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { userKeys } from "@/lib/query/users";
import type { CancellationTranslationTarget } from "@/types/cancellation-translation";
import type { ContentLanguage } from "@/types/content-language";

interface Props {
  kind: CancellationTranslationTarget;
  id: number | string;
  originalText: string;
}

export function CancellationReasonText(props: Readonly<Props>) {
  const profile = useMyProfile();
  const language = getContentLanguage(useLocale() as Locale);
  const t = useTranslations("CancellationTranslation");
  if (!profile)
    return (
      <span role="status" className="block text-xs text-muted">
        {t("loading")}
      </span>
    );
  if (profile?.status !== "success")
    return <ProfileUnavailable originalText={props.originalText} />;
  // Remount on account/target/locale/source changes; no previous private state is reused.
  return (
    <Reason
      key={`${profile.profile.userId}:${props.kind}:${props.id}:${language}:${props.originalText}`}
      {...props}
      userId={profile.profile.userId}
      language={language}
    />
  );
}

function ProfileUnavailable({ originalText }: Readonly<{ originalText: string }>) {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: userKeys.me(), exact: true }) > 0;
  return (
    <span className="block">
      <span className="block break-words whitespace-pre-line">{originalText}</span>
      <TranslationRetry
        isFetching={isFetching}
        onRetry={() => {
          void queryClient.refetchQueries(
            { queryKey: userKeys.me(), exact: true },
            { cancelRefetch: false },
          );
        }}
      />
    </span>
  );
}

function TranslationRetry({
  isFetching,
  onRetry,
}: Readonly<{ isFetching: boolean; onRetry: () => void }>) {
  const t = useTranslations("CancellationTranslation");
  return (
    <>
      <button
        type="button"
        disabled={isFetching}
        onClick={(event) => {
          event.stopPropagation();
          onRetry();
        }}
        className="min-h-9 text-xs text-primary underline underline-offset-2 disabled:opacity-50"
      >
        {t(isFetching ? "loading" : "retry")}
      </button>
      <span role="status" className="block text-xs text-muted">
        {t("unavailable")}
      </span>
    </>
  );
}

function Reason({
  kind,
  id,
  originalText,
  userId,
  language,
}: Props & { userId: number; language: ContentLanguage }) {
  const t = useTranslations("CancellationTranslation");
  const instanceId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = containerRef.current;
    if (!element || visible || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  const query = useQuery({
    queryKey: ["cancellation-translation", userId, kind, String(id), language, instanceId],
    queryFn: async ({ signal }) =>
      unwrapApiResult(await getCancellationTranslation(kind, id, language, signal), "translation"),
    // Translate only visible reasons, not every row in the list. Never poll/retry automatically.
    enabled: visible,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
    staleTime: 0,
  });
  useAuthQueryRedirect(query.error);
  const result = query.data?.targetLanguage === language ? query.data : undefined;
  const translated = result?.status === "TRANSLATED" && !!result.displayText;
  const mismatched = query.isSuccess && !result;
  const unavailable = query.isError || mismatched || result?.status === "UNAVAILABLE";
  const text = translated ? result.displayText : (result?.originalText ?? originalText);
  const loading = !result && !query.isError && !mismatched;
  return (
    <span ref={containerRef} className="block">
      {loading ? (
        <span role="status" className="block text-xs text-muted">
          {t("loading")}
        </span>
      ) : (
        <span
          className="block break-words whitespace-pre-line"
          lang={
            translated
              ? getContentLanguageTag(language)
              : result
                ? getContentLanguageTag(result.sourceLanguage)
                : undefined
          }
        >
          {text}
        </span>
      )}
      {unavailable ? (
        <TranslationRetry
          isFetching={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : null}
    </span>
  );
}
