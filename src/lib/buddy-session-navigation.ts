import { getSeoulDateTimeParts, toSeoulStartAt } from "@/lib/datetime";

export type SessionSearchParams = Record<string, string | string[] | undefined>;
export type DashboardSessionSelection = { activityId: number; scheduleId: number; date: string };

/** Rejects ambiguous, non-positive and unsafe query IDs before restoring a session. */
function positiveId(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** Validates the complete KST date/activity/session context supplied in the URL. */
export function parseDashboardSession(
  params: SessionSearchParams,
): DashboardSessionSelection | undefined {
  const activityId = positiveId(params.activityId);
  const scheduleId = positiveId(params.scheduleId);
  const date = params.date;
  if (!activityId || !scheduleId || typeof date !== "string" || !toSeoulStartAt(`${date}T00:00`))
    return undefined;
  return { activityId, scheduleId, date };
}

/** Builds a fixed dashboard URL for refreshing or returning to the selected session. */
export function dashboardSessionHref(activityId: number, scheduleId: number, startAt: string) {
  const date = getSeoulDateTimeParts(startAt)?.date;
  if (!date) return null;
  return `/dashboard?${new URLSearchParams({ date, activityId: String(activityId), scheduleId: String(scheduleId) })}`;
}

/** Carries the originating session to the owner detail page. */
export function activityDetailFromSessionHref(
  activityId: number,
  scheduleId: number,
  startAt: string,
) {
  const date = getSeoulDateTimeParts(startAt)?.date;
  const path = `/my-activities/${activityId}`;
  if (!date) return path;
  return `${path}?${new URLSearchParams({ from: "applications", date, scheduleId: String(scheduleId) })}`;
}

/** Returns to the validated session, or My Activities for ordinary detail visits. */
export function activityDetailBackHref(activityId: string, params: SessionSearchParams) {
  const selection = parseDashboardSession({ ...params, activityId });
  if (params.from !== "applications" || !selection) return "/my-activities";
  // Build a fixed internal destination rather than accepting an arbitrary return URL.
  return `/dashboard?${new URLSearchParams({ date: selection.date, activityId: String(selection.activityId), scheduleId: String(selection.scheduleId) })}`;
}
