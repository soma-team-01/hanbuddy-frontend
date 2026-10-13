"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { ActivityVisibilityControl } from "@/components/buddy/ActivityVisibilityControl";
import { ActivityManageActions } from "@/components/buddy/ActivityManageActions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { EyeIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
import { deleteMyActivity } from "@/lib/api/buddy";
import { mapMyActivityDetailToPreviewActivity } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { buddyKeys, myActivityQueryOptions } from "@/lib/query/buddy";
import { activityKeys } from "@/lib/query/activities";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus, MyActivitySummaryResponse } from "@/types/buddy";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const activityQuery = useQuery(myActivityQueryOptions(activityId));
  const profileResult = useMyProfile();
  const deleteMutation = useMutation({
    mutationFn: async () => unwrapApiResult(await deleteMyActivity(Number(activityId)), "message"),
    onSuccess: async () => {
      setDeleteOpen(false);
      queryClient.setQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
        (current = []) => current.filter((activity) => activity.activityId !== Number(activityId)),
      );
      router.replace("/my-activities");
      // Mark the removed detail stale without refetching it before navigation finishes.
      await queryClient.invalidateQueries({
        queryKey: buddyKeys.activityDetail(activityId),
        refetchType: "none",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: buddyKeys.myActivities() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.applications() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.scheduleDates() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });
  useAuthQueryRedirect(activityQuery.error ?? deleteMutation.error);

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
          className="mx-auto flex w-full max-w-[840px] flex-col gap-3 rounded-2xl border border-line-soft bg-transparent p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-soft text-muted">
              <EyeIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-display text-sm font-bold text-ink">
                {t("previewTitle")}
                {detail.status !== "ACTIVE" && detail.status !== "INACTIVE" ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-display text-xs font-semibold ${
                      STATUS_BADGE_CLASS[detail.status]
                    }`}
                  >
                    {tStatus(`status.${STATUS_MESSAGE_KEY[detail.status]}`)}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted">{t("previewNotice")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2">
            {detail.status === "ACTIVE" || detail.status === "INACTIVE" ? (
              <ActivityVisibilityControl
                activityId={detail.activityId}
                title={detail.title}
                status={detail.status}
                disabled={deleteMutation.isPending}
              />
            ) : null}
            <ActivityManageActions
              activityId={detail.activityId}
              title={detail.title}
              disabled={deleteMutation.isPending}
              onDelete={() => {
                deleteMutation.reset();
                setDeleteOpen(true);
              }}
            />
          </div>
        </div>
      </PageContainer>
      <ActivityDetailView activity={activity} preview bottomBar="inline" />
      {deleteOpen ? (
        <ConfirmDialog
          title={tStatus("deleteTitle")}
          description={tStatus("deleteDescription")}
          confirmLabel={tStatus("delete")}
          pendingLabel={tStatus("deleting")}
          tone="danger"
          cancelVariant="outline"
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleteOpen(false);
          }}
        >
          {deleteMutation.error ? (
            <p role="alert" className="text-sm text-danger">
              {getApiErrorMessage(deleteMutation.error, tStatus("deleteError"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
