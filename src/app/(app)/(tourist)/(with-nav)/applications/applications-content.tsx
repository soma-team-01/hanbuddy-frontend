"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelMyApplication } from "@/lib/api/applications";
import { mapApplicationResponseToApplication } from "@/lib/api/application-view";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ApplicationCancellationReason, ApplicationResponse } from "@/types/application";
import { ApplicationList } from "./application-list";
import type { CancelDialogOutcome } from "./cancel-dialog";

export function ApplicationsContent() {
  const queryClient = useQueryClient();
  const applicationsQuery = useQuery(myApplicationsQueryOptions());
  const cancelApplicationMutation = useMutation({
    mutationFn: async ({
      applicationId,
      reason,
    }: {
      applicationId: string;
      reason: ApplicationCancellationReason;
    }) => unwrapApiResult(await cancelMyApplication(applicationId, reason), "application"),
    onSuccess: (application) => {
      queryClient.setQueryData<ApplicationResponse[]>(applicationKeys.mine(), (current = []) =>
        current.map((item) =>
          item.applicationId === application.applicationId ? application : item,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
    },
  });
  useAuthQueryRedirect(applicationsQuery.error ?? cancelApplicationMutation.error);

  const applications = (applicationsQuery.data ?? []).map(mapApplicationResponseToApplication);

  async function handleCancelApplication(
    applicationId: string,
    reason: ApplicationCancellationReason,
  ): Promise<CancelDialogOutcome> {
    try {
      await cancelApplicationMutation.mutateAsync({ applicationId, reason });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "신청을 취소하지 못했습니다.",
      };
    }
  }

  if (applicationsQuery.isPending) {
    return <p className="py-10 text-center text-ink-soft">Loading applications...</p>;
  }

  if (applicationsQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {applicationsQuery.error.message}
      </p>
    );
  }

  return (
    <ApplicationList applications={applications} onCancelApplication={handleCancelApplication} />
  );
}
