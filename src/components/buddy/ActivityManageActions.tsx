"use client";

import { useTranslations } from "next-intl";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

/** Keep the list and detail management actions visually identical. */
export function ActivityManageActions({
  activityId,
  title,
  onDelete,
  disabled = false,
}: Readonly<{
  activityId: number;
  title: string;
  onDelete: () => void;
  disabled?: boolean;
}>) {
  const t = useTranslations("MyActivities");
  return (
    <span className="flex items-center gap-1">
      <Link
        href={`/my-activities/${activityId}/edit`}
        aria-label={t("editActivity", { title })}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted hover:bg-primary-soft hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-primary aria-disabled:opacity-50"
      >
        <PencilIcon className="size-3.5" />
        <span>{t("edit")}</span>
      </Link>
      <button
        type="button"
        aria-label={t("deleteActivity", { title })}
        onClick={onDelete}
        disabled={disabled}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted hover:bg-primary-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TrashIcon className="size-3.5" />
        <span>{t("delete")}</span>
      </button>
    </span>
  );
}
