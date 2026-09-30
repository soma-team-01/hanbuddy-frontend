import { useTranslations } from "next-intl";
import { ArrowLeftIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "./PageContainer";

interface PageHeaderProps {
  title?: string;
  description?: string;
  backHref?: string;
  backOnMobileOnly?: boolean;
  closeHref?: string;
  onLeftClick?: () => void;
  action?: React.ReactNode;
  actionPlacement?: "end" | "below-title";
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  backHref,
  backOnMobileOnly = false,
  closeHref,
  onLeftClick,
  action,
  actionPlacement = "end",
  compact = false,
}: Readonly<PageHeaderProps>) {
  const t = useTranslations("Accessibility");
  const leftHref = backHref ?? closeHref;
  const LeftIcon = backHref ? ArrowLeftIcon : XIcon;
  const titleSize = backOnMobileOnly ? "text-xl md:text-3xl" : "text-2xl md:text-3xl";

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
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft ${backOnMobileOnly ? "md:hidden" : ""}`}
      >
        <LeftIcon className="size-5" />
      </Link>
    );
  }

  if (!title && !description && !leftSlot && !action) return null;

  return (
    <div
      data-testid="page-header"
      className={actionPlacement === "below-title" ? "relative z-10 bg-canvas" : "bg-canvas"}
    >
      <PageContainer
        data-testid="page-header-content"
        className={`flex ${actionPlacement === "below-title" ? "flex-wrap items-center gap-x-2 gap-y-3" : "items-end gap-3"} ${
          compact ? "min-h-20 py-4 md:min-h-24 md:py-5" : "min-h-24 py-5 md:min-h-28 md:py-6"
        }`}
      >
        {leftSlot}
        <div className="min-w-0 flex-1">
          {title ? (
            <h1
              className={`font-display font-extrabold tracking-[-0.04em] text-ink ${
                compact ? "text-2xl" : titleSize
              }`}
            >
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-muted md:text-base">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div
            className={
              actionPlacement === "below-title"
                ? "w-full min-w-0"
                : "flex shrink-0 items-center justify-end"
            }
          >
            {action}
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}
