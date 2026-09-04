import { AdminShell } from "../admin-shell";
import { AdminBuddiesDashboard } from "../buddies/buddies-dashboard";

export default function AdminBuddyApplicationsPage() {
  return (
    <AdminShell>
      <AdminBuddiesDashboard initialTab="approvals" />
    </AdminShell>
  );
}
