import { AdminShell } from "../../admin-shell";
import { AdminBuddyDetailView } from "./buddy-detail-view";

export default async function AdminBuddyDetailPage({
  params,
}: PageProps<"/admin/buddies/[buddyUserId]">) {
  const { buddyUserId } = await params;
  return (
    <AdminShell>
      <AdminBuddyDetailView buddyId={buddyUserId} />
    </AdminShell>
  );
}
