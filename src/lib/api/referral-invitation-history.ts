import { getReferralInvitations } from "./referral";
import { unwrapApiResult } from "@/lib/query/result";
import type { ReferralInvitation } from "@/types/referral";

// The existing list endpoint has no buddyId filter. Check all pages before
// reporting an empty/complete history; retain only the selected account's rows.
export async function getBuddyInvitationHistory(buddyId: number, signal?: AbortSignal) {
  const matches = new Map<number, ReferralInvitation>();
  for (let page = 0; ; page += 1) {
    signal?.throwIfAborted();
    const result = unwrapApiResult(await getReferralInvitations(page), "data");
    signal?.throwIfAborted();
    for (const invitation of result.content) {
      if (invitation.buddyId === buddyId) matches.set(invitation.invitationId, invitation);
    }
    if (!result.hasNext) return [...matches.values()];
    if (result.page !== page || !result.content.length) {
      throw new Error("Invalid invitation pagination");
    }
  }
}
