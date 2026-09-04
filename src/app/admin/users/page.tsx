import { AdminShell } from "../admin-shell";
import { AdminUsersDashboard } from "./users-dashboard";

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <AdminUsersDashboard />
    </AdminShell>
  );
}
