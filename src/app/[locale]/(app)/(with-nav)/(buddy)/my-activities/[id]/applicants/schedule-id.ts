export function normalizeScheduleId(scheduleId?: string | string[]) {
  const rawScheduleId = Array.isArray(scheduleId) ? scheduleId[0] : scheduleId;
  return rawScheduleId?.trim() || undefined;
}
