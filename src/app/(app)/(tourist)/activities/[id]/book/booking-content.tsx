"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTouristActivity } from "@/lib/api/activities";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import type { Activity } from "@/types/activity";
import { BookingForm } from "./booking-form";

export function BookingContent({ activityId }: Readonly<{ activityId: string }>) {
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getTouristActivity(activityId)
      .then((result) => {
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

        setActivity(mapTouristActivityDetailToActivity(result.activity));
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage("예약 정보를 불러오지 못했습니다.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activityId, router]);

  if (isLoading) {
    return <p className="px-4 py-10 text-center text-ink-soft">Loading booking...</p>;
  }

  if (errorMessage || !activity) {
    return (
      <main className="px-4 py-6">
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {errorMessage || "예약 정보를 불러오지 못했습니다."}
        </p>
      </main>
    );
  }

  return <BookingForm activity={activity} />;
}
