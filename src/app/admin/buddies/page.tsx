import { AdminShell } from "@/app/admin/admin-shell";
import { AdminBuddiesDashboard } from "@/app/admin/buddies/buddies-dashboard";

export default function AdminBuddiesPage() {
  return (
    <AdminShell>
      <AdminBuddiesDashboard />
    </AdminShell>
  );
}
