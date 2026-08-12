"use client";

import { useTranslations } from "next-intl";
import { WonCoinIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";

/** 상단바의 정산 진입점. 채팅 아이콘과 같은 테두리 없는 아이콘 스타일 */
export function SettlementNavIcon({ compact = false }: Readonly<{ compact?: boolean }>) {
  const t = useTranslations("Settlement");
  const pathname = usePathname() ?? "";
  const active = pathname.startsWith("/dashboard/settlement");
  const size = compact ? "size-10" : "size-11";

  return (
    <Link
      href="/dashboard/settlement"
      aria-label={t("title")}
      title={t("title")}
      aria-current={active ? "page" : undefined}
      className={`inline-flex ${size} items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "text-primary" : "text-ink hover:text-primary"
      }`}
    >
      <WonCoinIcon className="size-6" />
    </Link>
  );
}
