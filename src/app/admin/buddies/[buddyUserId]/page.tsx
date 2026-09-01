import { AdminHeader } from "../../admin-header";
import { AdminBuddyDetailView } from "./buddy-detail-view";

export default async function AdminBuddyDetailPage({
  params,
}: PageProps<"/admin/buddies/[buddyUserId]">) {
  const { buddyUserId } = await params;
  return (
    <>
      <AdminHeader />
      <AdminBuddyDetailView buddyId={buddyUserId} />
    </>
  );
}
