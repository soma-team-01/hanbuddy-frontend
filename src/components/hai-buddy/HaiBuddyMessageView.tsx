"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { InquiryTemplate } from "@/components/contact/InquiryTemplate";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { sendHaiBuddyFeedback } from "@/lib/api/hai-buddy";
import { getSeoulDateTimeParts } from "@/lib/datetime";
import type { HaiBuddyCitation, HaiBuddyMessage, HaiBuddyRecommendation } from "@/types/hai-buddy";

/** 답 본문의 링크는 글자로만 보인다. 이동은 근거 칩과 추천 카드가 맡는다. */
const MARKDOWN_COMPONENTS = {
  a: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
};

export function HaiBuddyMessageView({
  message,
  contactMessage,
}: Readonly<{ message: HaiBuddyMessage; contactMessage: (summary: string | null) => string }>) {
  if (message.role === "USER") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 whitespace-pre-line text-white">
        {message.content}
      </div>
    );
  }
  return (
    <div className="flex max-w-full flex-col gap-3">
      <AiLabel generalGuidance={message.generalGuidance} />
      <div className="-mt-2 max-w-[92%] rounded-2xl rounded-bl-md bg-canvas px-4 py-2.5 text-sm leading-6 text-ink [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>{message.content}</ReactMarkdown>
      </div>
      {message.citations.length > 0 && <Citations citations={message.citations} />}
      {message.recommendedActivities.length > 0 && (
        <Recommendations recommendations={message.recommendedActivities} />
      )}
      {message.handoff === "CONTACT" && (
        <ContactCard message={contactMessage(message.handoffSummary)} />
      )}
      {message.messageId > 0 && <Feedback messageId={message.messageId} />}
    </div>
  );
}

/** 사람이 아니라 AI가 쓴 답이라는 표시. 일반 상식으로 답했으면 한버디가 확인한 정보가 아님을 함께 알린다. */
function AiLabel({ generalGuidance }: Readonly<{ generalGuidance: boolean }>) {
  const t = useTranslations("HaiBuddy");
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-xs font-semibold text-muted">
        <span aria-hidden>✨</span>
        <span>{t("aiAnswer")}</span>
      </span>
      {generalGuidance && (
        <span className="w-fit rounded-md bg-[#FFF4D6] px-2 py-1 text-xs leading-5 text-ink">
          {t("generalGuidance")}
        </span>
      )}
    </div>
  );
}

function Citations({ citations }: Readonly<{ citations: HaiBuddyCitation[] }>) {
  const t = useTranslations("HaiBuddy");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">{t("sources")}</span>
      {citations.map((citation) => {
        // 응대 사례는 실제 대화에서 만든 지식이라 내용 대신 종류만 보여 준다.
        const label =
          citation.source === "CASE"
            ? t("sourceType.CASE")
            : `${t(`sourceType.${citation.source}`)} · ${citation.title}`;
        const className =
          "max-w-full truncate rounded-full border border-line-soft px-2.5 py-1 text-xs text-muted";
        return citation.url && citation.source !== "CASE" ? (
          <a
            key={citation.citationId}
            href={citation.url}
            className={`${className} hover:border-primary hover:text-primary-strong`}
          >
            {label}
          </a>
        ) : (
          <span key={citation.citationId} className={className}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

function Recommendations({
  recommendations,
}: Readonly<{ recommendations: HaiBuddyRecommendation[] }>) {
  const t = useTranslations("HaiBuddy");
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {recommendations.map(({ activity, nextScheduleStartAt }) => {
        const next = nextScheduleStartAt ? getSeoulDateTimeParts(nextScheduleStartAt) : null;
        return (
          <Link
            key={activity.activityId}
            href={`/activities/${activity.activityId}`}
            className="w-44 shrink-0 snap-start rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ActivityCard activity={mapTouristActivitySummaryToActivity(activity)} variant="tile" />
            {next && (
              <p className="mt-1 text-xs leading-5 font-medium text-primary-strong">
                {t("nextDate", { date: `${next.date} ${next.time}` })}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function ContactCard({ message }: Readonly<{ message: string }>) {
  const t = useTranslations("HaiBuddy");
  return (
    <div className="-mt-2">
      <InquiryTemplate
        message={message}
        placement="hai_buddy"
        labels={{
          title: t("contactTitle"),
          hint: t("contactHint"),
          copy: t("copy"),
          copied: t("copied"),
          copyFailed: t("copyFailed"),
        }}
      />
    </div>
  );
}

function Feedback({ messageId }: Readonly<{ messageId: number }>) {
  const t = useTranslations("HaiBuddy");
  const [sent, setSent] = useState(false);
  const feedback = useMutation({
    mutationFn: (rating: "UP" | "DOWN") => sendHaiBuddyFeedback(messageId, rating),
    onSuccess: (result) => setSent(result.status === "success"),
  });
  if (sent) return <p className="text-xs text-muted">{t("feedbackThanks")}</p>;
  return (
    <div className="flex gap-1.5">
      {(["UP", "DOWN"] as const).map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={feedback.isPending}
          aria-label={rating === "UP" ? t("helpful") : t("notHelpful")}
          onClick={() => feedback.mutate(rating)}
          className="min-h-8 rounded-full border border-line-soft px-2.5 text-xs text-muted hover:border-primary hover:text-primary-strong"
        >
          {rating === "UP" ? `👍 ${t("helpful")}` : `👎 ${t("notHelpful")}`}
        </button>
      ))}
    </div>
  );
}
