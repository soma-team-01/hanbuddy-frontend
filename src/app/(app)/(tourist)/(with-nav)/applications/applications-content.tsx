"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/api/applications";
import { mapApplicationResponseToApplication } from "@/lib/api/application-view";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

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

  return <ApplicationList applications={applications} />;
}
