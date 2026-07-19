import { useTranslations } from "next-intl";
import { ArrowLeftIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

interface TopAppBarProps {
  title?: string;
  /** 지정하면 왼쪽에 뒤로가기(화살표) 버튼이 노출된다. */
  backHref?: string;
  /** 지정하면 왼쪽에 닫기(X) 버튼이 노출된다. backHref가 우선. */
  closeHref?: string;
  /** 지정하면 뒤로가기를 링크 대신 버튼으로 렌더한다(이탈 가드용). backHref/closeHref보다 우선. */
  onLeftClick?: () => void;
  /** 오른쪽 슬롯 (예: Save 버튼) */
  action?: React.ReactNode;
}

export function TopAppBar({
  title = "HanBuddy",
  backHref,
  closeHref,
  onLeftClick,
  action,
}: Readonly<TopAppBarProps>) {
  const t = useTranslations("Accessibility");
  const leftHref = backHref ?? closeHref;
  const LeftIcon = backHref ? ArrowLeftIcon : XIcon;

  let leftSlot: React.ReactNode = <span className="size-10 shrink-0" aria-hidden />;
  if (onLeftClick) {
    leftSlot = (
      <button
        type="button"
        aria-label={t("goBack")}
        onClick={onLeftClick}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-forest hover:bg-chip"
      >
        <ArrowLeftIcon className="size-5" />
      </button>
    );
  } else if (leftHref) {
    leftSlot = (
      <Link
        href={leftHref}
        aria-label={backHref ? t("goBack") : t("close")}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-forest hover:bg-chip"
      >
        <LeftIcon className="size-5" />
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-line bg-cream px-4">
      {leftSlot}
      <h1 className="truncate font-display text-[28px] font-semibold tracking-tight text-forest">
        {title === "HanBuddy" ? (
          // 브랜드 워드마크 클릭 시 역할별 홈(/explore | /dashboard)으로 이동
          <Link href="/home" className="transition-opacity hover:opacity-80">
            {title}
          </Link>
        ) : (
          title
        )}
      </h1>
      <div className="flex min-w-10 shrink-0 items-center justify-end">{action}</div>
    </header>
  );
}
