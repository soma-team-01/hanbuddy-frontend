"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { PageContainer } from "@/components/layout/PageContainer";
import { EyeIcon, PencilIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { mapMyActivityDetailToPreviewActivity } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus } from "@/types/buddy";

const STATUS_BADGE_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  DRAFT: "bg-panel-raised text-muted",
  INACTIVE: "bg-warning-soft text-warning",
  DELETED: "bg-panel-raised text-muted",
};

const STATUS_MESSAGE_KEY: Record<MyActivityStatus, "active" | "draft" | "inactive" | "deleted"> = {
  ACTIVE: "active",
  DRAFT: "draft",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

export function MyActivityDetailContent({ activityId }: Readonly<{ activityId: string }>) {
  const locale = useLocale();
  const t = useTranslations("MyActivityDetail");
  const tStatus = useTranslations("MyActivities");
  const tActivityDetail = useTranslations("ActivityDetail");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const activityQuery = useQuery(myActivityQueryOptions(activityId));
  const profileResult = useMyProfile();
  useAuthQueryRedirect(activityQuery.error);

  if (activityQuery.isPending) {
    return <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>;
  }

  if (activityQuery.error || !activityQuery.data) {
    return (
      <PageContainer className="py-6 md:py-10">
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(activityQuery.error, t("loadError"))}
        </p>
      </PageContainer>
    );
  }

  const detail = activityQuery.data;
  const profile = profileResult?.status === "success" ? profileResult.profile : null;
  const activity = mapMyActivityDetailToPreviewActivity(
    detail,
    tErrors("dateTimeUnavailable"),
    locale,
    {
      id: profile?.userId,
      name: profile?.displayName ?? profile?.name ?? t("fallbackHostName"),
      avatarUrl: profile?.profileImageUrl ?? null,
    },
    tActivityDetail("localHost"),
  );

  return (
    <div className="pb-32">
      <PageContainer className="pt-6 md:pt-8">
        <div
          role="note"
          data-testid="guest-preview-banner"
          className="mx-auto flex w-full max-w-[840px] flex-col gap-3 rounded-2xl border border-primary/25 bg-primary-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <EyeIcon className="size-4 text-primary-strong" />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-ink">
                {t("previewTitle")}
                <span
                  className={`rounded-full px-2.5 py-0.5 font-display text-xs font-semibold ${
                    STATUS_BADGE_CLASS[detail.status]
                  }`}
                >
                  {tStatus(`status.${STATUS_MESSAGE_KEY[detail.status]}`)}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted">{t("previewNotice")}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/my-activities/${detail.activityId}/edit`}
              className="flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 font-display text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover"
            >
              <PencilIcon className="size-3.5" />
              {t("edit")}
            </Link>
          </div>
        </div>
      </PageContainer>
      <ActivityDetailView activity={activity} preview />
    </div>
  );
}
