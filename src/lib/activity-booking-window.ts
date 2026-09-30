import type { Session } from "@/types/activity";

export const BOOKING_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

/** Client-side display guard only; the server decides at request receipt time. */
export function isBookingOpen(startAt: string | undefined, now = Date.now()): boolean {
  return Boolean(startAt) && Date.parse(startAt!) >= now + BOOKING_LEAD_TIME_MS;
}

export function isBookableSession(
  session: Pick<Session, "startAt" | "spotsLeft">,
  now = Date.now(),
): boolean {
  return session.spotsLeft > 0 && isBookingOpen(session.startAt, now);
}

/** A calendar day in Korea, not an instant in the browser's time zone. */
export function isActivitySearchDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function withActivityDate(path: string, date?: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (date) params.set("date", date);
  else params.delete("date");
  return params.size ? `${base}?${params.toString()}` : base;
}
