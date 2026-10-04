import type { AdminPageResponse } from "@/types/admin";
import type { ReferralActivitySummary, ReferralApplicant } from "@/types/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { getSeoulDateTimeParts } from "@/lib/datetime";
import { getReferralActivities, getReferralApplicants } from "./referral";
import {
  searchReferralBuddies,
  initialBuddySearchCursor,
  type BuddySearchCursor,
} from "./referral-admin-search";

// Existing contracts have no activity keyword or multi-status filter. Scan all
// relevant pages rather than filtering one page and reporting incomplete totals.
async function* pages<T>(
  read: (page: number) => Promise<AdminPageResponse<T>>,
  signal?: AbortSignal,
) {
  for (let page = 0; ; page++) {
    signal?.throwIfAborted();
    const data = await read(page);
    signal?.throwIfAborted();
    if (data.page !== page) throw new Error("Invalid report pagination");
    yield data.content;
    if (!data.hasNext) return;
    if (!data.content.length) throw new Error("Invalid report pagination");
  }
}
const activityPage = async (page: number) =>
  unwrapApiResult(await getReferralActivities(page), "data");

export async function getReferralActivityOwner(activityId: number, signal?: AbortSignal) {
  for await (const rows of pages(activityPage, signal)) {
    const match = rows.find((row) => row.activity.activityId === activityId);
    if (match) return match;
  }
  throw new Error("Activity owner unavailable");
}

export async function searchReferralActivities(term: string, signal?: AbortSignal) {
  const ids = new Set<number>();
  let cursor: BuddySearchCursor | undefined = initialBuddySearchCursor;
  while (cursor) {
    signal?.throwIfAborted();
    const result = await searchReferralBuddies(term, cursor, false);
    result.buddies.forEach((buddy) => ids.add(buddy.buddyId));
    cursor = result.next;
  }
  signal?.throwIfAborted();
  const matches = new Map<number, ReferralActivitySummary>();
  if (!ids.size) return [];
  for await (const rows of pages(activityPage, signal)) {
    for (const row of rows)
      if (ids.has(row.partnerUserId)) matches.set(row.activity.activityId, row);
  }
  return [...matches.values()];
}

export async function getRetainedApplicants(filters: URLSearchParams, signal?: AbortSignal) {
  const groups = await Promise.all(
    ["CONFIRMED", "COMPLETED"].map(async (status) => {
      const matches = new Map<number, ReferralApplicant>();
      for await (const rows of pages(async (page) => {
        const params = new URLSearchParams(filters);
        params.set("status", status);
        params.set("page", String(page));
        params.set("size", "100");
        return unwrapApiResult(await getReferralApplicants(true, params), "data");
      }, signal)) {
        for (const row of rows) matches.set(row.applicationId, row);
      }
      return [...matches.values()];
    }),
  );
  return [...new Map(groups.flat().map((row) => [row.applicationId, row])).values()].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.applicationId - a.applicationId,
  );
}

/** All statuses, by application creation day in KST; never mark the activity day. */
export async function getReferralApplicationDates(
  activityId: number,
  from: string,
  until: string,
  signal?: AbortSignal,
) {
  const dates = new Set<string>();
  for await (const rows of pages(async (page) => {
    const params = new URLSearchParams({
      activityId: String(activityId),
      from,
      until,
      page: String(page),
      size: "100",
    });
    return unwrapApiResult(await getReferralApplicants(true, params), "data");
  }, signal)) {
    for (const row of rows) {
      const date = getSeoulDateTimeParts(row.createdAt)?.date;
      if (date && date >= from && date <= until) dates.add(date);
    }
  }
  return [...dates].sort((a, b) => a.localeCompare(b));
}
