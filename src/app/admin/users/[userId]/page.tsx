import { AdminShell } from "@/app/admin/admin-shell";
import { AdminUserDetailView } from "@/app/admin/users/[userId]/user-detail-view";

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
