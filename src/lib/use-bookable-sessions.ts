"use client";

import { useEffect, useMemo, useState } from "react";
import { isBookableSession } from "@/lib/activity-booking-window";
import type { Session } from "@/types/activity";

/** Re-evaluate an open screen as a schedule crosses its booking deadline. */
export function useBookableSessions(sessions: Session[], preview = false) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (preview) return;
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [preview]);
  return useMemo(
    () =>
      sessions.filter((session) =>
        preview ? session.spotsLeft > 0 : isBookableSession(session, now),
      ),
    [sessions, preview, now],
  );
}
