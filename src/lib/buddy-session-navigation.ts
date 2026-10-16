import { getSeoulDateTimeParts, toSeoulStartAt } from "@/lib/datetime";

export type SessionSearchParams = Record<string, string | string[] | undefined>;
export type DashboardSessionSelection = { activityId: number; scheduleId: number; date: string };

function positiveId(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

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

export function activityDetailBackHref(activityId: string, params: SessionSearchParams) {
  const selection = parseDashboardSession({ ...params, activityId });
  if (params.from !== "applications" || !selection) return "/my-activities";
  // Build a fixed internal destination rather than accepting an arbitrary return URL.
  return `/dashboard?${new URLSearchParams({ date: selection.date, activityId: String(selection.activityId), scheduleId: String(selection.scheduleId) })}`;
}
