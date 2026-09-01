import { AdminHeader } from "../../admin-header";
import { AdminUserDetailView } from "./user-detail-view";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <>
      <AdminHeader />
      <AdminUserDetailView userId={userId} />
    </>
  );
}
