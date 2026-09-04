import { AdminShell } from "../../admin-shell";
import { AdminUserDetailView } from "./user-detail-view";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <AdminShell>
      <AdminUserDetailView userId={userId} />
    </AdminShell>
  );
}
