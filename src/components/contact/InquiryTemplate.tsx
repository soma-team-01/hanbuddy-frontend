"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useMeasurementEvents } from "@/components/analytics/AnalyticsProvider";
import { ContactChannelLinks } from "@/components/contact/ContactChannelLinks";
import { getLocaleOrDefault } from "@/i18n/routing";

export interface InquiryTemplateLabels {
  title: string;
  hint: string;
  copy: string;
  copied: string;
  copyFailed: string;
}

/** 미리 채운 문의 문구 + 복사 + 공식 연락 채널. 결제 문의 창과 HAI Buddy 연락 카드가 같이 쓴다. */
export function InquiryTemplate({
  message,
  labels,
  placement,
  messageTestId,
}: Readonly<{
  message: string;
  labels: InquiryTemplateLabels;
  placement: string;
  messageTestId?: string;
}>) {
  const locale = getLocaleOrDefault(useLocale());
  const { trackInquiry } = useMeasurementEvents();
  const [copyState, setCopyState] = useState<{ message: string; result: "copied" | "failed" } | null>(
    null,
  );

  /** Copies the localized inquiry template and exposes clipboard failures to the user. */
  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState({ message, result: "copied" });
    } catch {
      setCopyState({ message, result: "failed" });
    }
  }

  return (
    <>
      <div className="mt-5 rounded-xl border border-line-soft p-4">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        <p className="mt-1 mb-3 text-xs leading-5 text-muted">{labels.hint}</p>
        <p
          data-testid={messageTestId}
          className="text-sm leading-6 break-words whitespace-pre-line select-text"
        >
          {message}
        </p>
        <button
          type="button"
          onClick={() => void copyTemplate()}
          className="mt-3 min-h-11 w-full rounded-lg border border-primary px-3 text-sm font-semibold text-primary-strong transition-colors hover:border-primary-hover hover:text-primary-hover"
        >
          {labels.copy}
        </button>
        {copyState?.message === message && (
          <p role="status" className="mt-2 text-xs leading-5 text-muted">
            {copyState.result === "copied" ? labels.copied : labels.copyFailed}
          </p>
        )}
      </div>
      <ContactChannelLinks
        message={message}
        onChannelClick={(channel) => trackInquiry({ channel, placement, locale })}
      />
    </>
  );
}
