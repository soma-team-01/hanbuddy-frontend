import { AdminShell } from "@/app/admin/admin-shell";
import { AdminUsersDashboard } from "@/app/admin/users/users-dashboard";

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <AdminUsersDashboard />
    </AdminShell>
  );
}
