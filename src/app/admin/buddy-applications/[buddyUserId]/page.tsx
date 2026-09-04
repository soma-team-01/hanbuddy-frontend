import { AdminShell } from "@/app/admin/admin-shell";
import { BuddyApplicationReview } from "@/app/admin/buddies/[buddyUserId]/buddy-application-review";

export default async function BuddyApplicationPage({
  params,
}: {
  params: Promise<{ buddyUserId: string }>;
}) {
  const { buddyUserId } = await params;
  return (
    <AdminShell>
      <BuddyApplicationReview userId={buddyUserId} />
    </AdminShell>
  );
}
