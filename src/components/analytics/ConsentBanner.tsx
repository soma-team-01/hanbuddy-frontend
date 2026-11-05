"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { getPolicyPath } from "@/lib/policy-routes";

interface ConsentBannerProps {
  locale: Locale;
  title: string;
  body: string;
  acceptLabel: string;
  rejectLabel: string;
  /** 쿠키 설정 버튼으로 직접 열었을 때만 포커스를 옮긴다. 첫 방문 자동 표시는 포커스를 건드리지 않는다. */
  focusOnOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/** 화면을 막지 않는 쿠키 동의 창. 모바일은 하단 시트, md 이상은 오른쪽 아래 카드로 띄운다. */
export function ConsentBanner({
  locale,
  title,
  body,
  acceptLabel,
  rejectLabel,
  focusOnOpen,
  onAccept,
  onReject,
}: Readonly<ConsentBannerProps>) {
  const authT = useTranslations("Auth");
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnOpen) titleRef.current?.focus();
  }, [focusOnOpen]);

  return (
    <section
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-line-soft bg-canvas-soft px-5 pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-ink shadow-[0_-12px_40px_rgba(38,27,24,0.16)] md:inset-x-auto md:right-6 md:bottom-6 md:w-[400px] md:rounded-2xl md:border md:p-6 md:shadow-[0_12px_40px_rgba(38,27,24,0.18)]"
    >
      <h2
        id="consent-banner-title"
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-lg font-bold text-ink outline-none"
      >
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {body}{" "}
        <Link
          href={getPolicyPath(locale, "privacy-policy")}
          className="rounded-sm font-semibold text-ink underline underline-offset-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          {authT("privacyPolicy")}
        </Link>
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onReject}
          className="h-12 flex-1 rounded-xl border border-line-strong bg-panel font-display text-sm font-semibold text-ink transition-colors hover:bg-panel-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:h-11"
        >
          {rejectLabel}
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="h-12 flex-1 rounded-xl bg-primary font-display text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:h-11"
        >
          {acceptLabel}
        </button>
      </div>
    </section>
  );
}
