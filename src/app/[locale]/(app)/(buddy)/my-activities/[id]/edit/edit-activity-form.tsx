"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { CreateActivityForm } from "@/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form";
import { buildDraftFromMyActivityDetail } from "@/app/[locale]/(app)/(buddy)/my-activities/create/activity-create-wizard";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function EditActivityForm({ activityId }: Readonly<{ activityId: string }>) {
  const t = useTranslations("CreateActivity");
  const getApiErrorMessage = useApiErrorMessage();
  const activityQuery = useQuery(myActivityQueryOptions(activityId));
  useAuthQueryRedirect(activityQuery.error);

  const initialDraft = useMemo(
    () => (activityQuery.data ? buildDraftFromMyActivityDetail(activityQuery.data) : null),
    [activityQuery.data],
  );

  if (activityQuery.isPending) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#fff] px-6 text-center text-muted">
        {t("edit.loading")}
      </div>
    );
  }

  if (activityQuery.error || !initialDraft || !activityQuery.data) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[#fff] px-6">
        <p
          role="alert"
          className="max-w-md rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-center text-sm text-danger"
        >
          {getApiErrorMessage(activityQuery.error, t("edit.loadError"))}
        </p>
        <Link
          href={`/my-activities/${activityId}`}
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-white px-5 text-sm font-bold text-ink transition hover:border-primary hover:text-primary-strong"
        >
          {t("edit.backToActivity")}
        </Link>
      </div>
    );
  }

  return (
    <CreateActivityForm
      mode="edit"
      activityId={activityId}
      initialDraft={initialDraft}
      initialStatus={activityQuery.data.status}
    />
  );
}
