import { getAdminBuddies } from "./admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminBuddySummary } from "@/types/admin";

const fields = ["displayName", "name", "email"] as const;
export type BuddySearchCursor = Record<(typeof fields)[number], number | null>;
export const initialBuddySearchCursor: BuddySearchCursor = { displayName: 0, name: 0, email: 0 };

/** Backend combines fields with AND. Separate paginated queries implement OR without omissions. */
export async function searchReferralBuddies(term: string, cursor: BuddySearchCursor) {
  const pages = await Promise.all(
    fields.map(async (field) => {
      const page = cursor[field];
      if (page === null || !term.trim()) return { field, data: null };
      return {
        field,
        data: unwrapApiResult(
          await getAdminBuddies({ [field]: term.trim(), accountStatus: "ACTIVE", page, size: 20 }),
          "buddies",
        ),
      };
    }),
  );
  const next: BuddySearchCursor = { displayName: null, name: null, email: null };
  const unique = new Map<number, AdminBuddySummary>();
  for (const { field, data } of pages) {
    if (!data) continue;
    for (const buddy of data.content) unique.set(buddy.buddyId, buddy);
    if (data.hasNext) next[field] = cursor[field]! + 1;
  }
  return {
    buddies: [...unique.values()],
    next: fields.some((field) => next[field] !== null) ? next : undefined,
  };
}
