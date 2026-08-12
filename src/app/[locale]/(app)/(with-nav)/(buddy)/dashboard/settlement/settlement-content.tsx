"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatKrw } from "@/lib/format";
import { formatDateKeyLong } from "@/lib/buddy-calendar";
import { SETTLEMENT_MOCK, type SettlementItem } from "../settlement-mock";

/**
 * 정산 상세. 아직 목업 데이터로 그린다 — 백엔드 연동 시 settlement-mock을 응답으로 대체한다.
 * 위에는 이번 달 요약, 아래에는 지급 예정/완료를 나눠 회차 단위로 보여준다.
 */
export function SettlementContent() {
  const locale = useLocale() as Locale;
  const t = useTranslations("Settlement");

  const scheduled = SETTLEMENT_MOCK.items.filter(({ status }) => status === "scheduled");
  const paid = SETTLEMENT_MOCK.items.filter(({ status }) => status === "paid");

  return (
    <div className="flex flex-col gap-7">
      {/* 목업 안내 — 실데이터로 오해하지 않게 명시한다 */}
      <p className="border-l-2 border-primary/40 pl-3 text-xs leading-5 text-muted">
        {t("mockNotice")}
      </p>

      <section className="flex flex-col gap-1 rounded-2xl border border-line-soft p-5">
        <p className="text-xs text-muted">{t("expectedThisMonth")}</p>
        <p className="font-display text-3xl font-bold text-primary tabular-nums">
          {formatKrw(SETTLEMENT_MOCK.expectedAmount, locale)}
        </p>
        <p className="text-xs text-muted">
          {t("basedOn", { count: SETTLEMENT_MOCK.confirmedCount })}
          {" · "}
          {t("payoutDate", { date: formatDateKeyLong(SETTLEMENT_MOCK.payoutDate, locale) })}
        </p>
      </section>

      <SettlementGroup heading={t("upcoming")} items={scheduled} locale={locale} showTotal />
      <SettlementGroup heading={t("paidOut")} items={paid} locale={locale} />
    </div>
  );
}

function SettlementGroup({
  heading,
  items,
  locale,
  showTotal = false,
}: Readonly<{
  heading: string;
  items: SettlementItem[];
  locale: Locale;
  showTotal?: boolean;
}>) {
  const t = useTranslations("Settlement");
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
        {heading}
      </h2>
      <ul className="flex flex-col divide-y divide-line-soft rounded-2xl border border-line-soft">
        {items.map((item) => (
          <li key={item.settlementId} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xs font-bold text-ink">
                {item.activityTitle}
              </p>
              <p className="text-[11px] text-muted">
                {formatDateKeyLong(item.date, locale)} {item.timeLabel}
                {" · "}
                {t("guests", { count: item.guestCount })}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-sm font-bold text-ink tabular-nums">
                {formatKrw(item.amount, locale)}
              </p>
              <p
                className={`text-[11px] font-semibold ${
                  item.status === "scheduled" ? "text-primary" : "text-muted"
                }`}
              >
                {item.status === "scheduled" ? t("statusScheduled") : t("statusPaid")}
              </p>
            </div>
          </li>
        ))}
        {showTotal ? (
          <li className="flex items-center justify-between px-4 py-3">
            <p className="font-display text-xs font-bold text-ink">{t("total")}</p>
            <p className="font-display text-sm font-bold text-primary tabular-nums">
              {formatKrw(total, locale)}
            </p>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
