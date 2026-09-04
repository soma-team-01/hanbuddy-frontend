import { AdminShell } from "@/app/admin/admin-shell";
import { AdminBuddyDetailView } from "@/app/admin/buddies/[buddyUserId]/buddy-detail-view";

export default async function AdminBuddyDetailPage({
  params,
}: Readonly<{ params: Promise<{ buddyUserId: string }> }>) {
  const { buddyUserId } = await params;
  return (
    <AdminShell>
      <AdminBuddyDetailView buddyId={buddyUserId} />
    </AdminShell>
  );
}
