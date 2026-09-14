import { AdminShell } from "@/app/admin/admin-shell";
import { AdminBuddiesDashboard } from "@/app/admin/buddies/buddies-dashboard";

export default function AdminBuddyApplicationsPage() {
  return (
    <AdminShell>
      <AdminBuddiesDashboard initialTab="approvals" />
    </AdminShell>
  );
}
