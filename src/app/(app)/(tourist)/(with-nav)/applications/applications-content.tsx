"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelMyApplication, getMyApplications } from "@/lib/api/applications";
import { mapApplicationResponseToApplication } from "@/lib/api/application-view";
import type { Application, ApplicationCancellationReason } from "@/types/application";
import { ApplicationList } from "./application-list";
import type { CancelDialogOutcome } from "./cancel-dialog";

export function ApplicationsContent() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyApplications().then((result) => {
      if (!isMounted) return;
      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        setIsLoading(false);
        return;
      }

      setApplications(result.applications.map(mapApplicationResponseToApplication));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleCancelApplication(
    applicationId: string,
    reason: ApplicationCancellationReason,
  ): Promise<CancelDialogOutcome> {
    const result = await cancelMyApplication(applicationId, reason);
    if (result.status === "unauthenticated") {
      router.replace("/login");
      return { ok: true };
    }
    if (result.status === "error") {
      return { ok: false, message: result.message };
    }

    setApplications((current) =>
      current.map((application) =>
        application.id === applicationId
          ? mapApplicationResponseToApplication(result.application)
          : application,
      ),
    );
    return { ok: true };
  }

  if (isLoading) {
    return <p className="py-10 text-center text-ink-soft">Loading applications...</p>;
  }

  if (errorMessage) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {errorMessage}
      </p>
    );
  }

  return (
    <ApplicationList applications={applications} onCancelApplication={handleCancelApplication} />
  );
}
