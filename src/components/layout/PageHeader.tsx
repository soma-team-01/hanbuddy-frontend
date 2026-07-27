import { useTranslations } from "next-intl";
import { ArrowLeftIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "./PageContainer";

interface PageHeaderProps {
  title?: string;
  description?: string;
  backHref?: string;
  closeHref?: string;
  onLeftClick?: () => void;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  closeHref,
  onLeftClick,
  action,
}: Readonly<PageHeaderProps>) {
  const t = useTranslations("Accessibility");
  const leftHref = backHref ?? closeHref;
  const LeftIcon = backHref ? ArrowLeftIcon : XIcon;

  let leftSlot: React.ReactNode = null;
  if (onLeftClick) {
    leftSlot = (
      <button
        type="button"
        aria-label={t("goBack")}
        onClick={onLeftClick}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft"
      >
        <ArrowLeftIcon className="size-5" />
      </button>
    );
  } else if (leftHref) {
    leftSlot = (
      <Link
        href={leftHref}
        aria-label={backHref ? t("goBack") : t("close")}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft"
      >
        <LeftIcon className="size-5" />
      </Link>
    );
  }

  if (!title && !description && !leftSlot && !action) return null;

  return (
    <header className="border-b border-line-soft bg-canvas">
      <PageContainer className="flex min-h-20 items-center gap-3 py-4 md:min-h-24">
        {leftSlot}
        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
              {title}
            </h1>
          ) : null}
          {description ? <p className="mt-1 text-sm text-muted md:text-base">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center justify-end">{action}</div> : null}
      </PageContainer>
    </header>
  );
}
