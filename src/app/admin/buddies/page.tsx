import { AdminShell } from "../admin-shell";
import { AdminBuddiesDashboard } from "./buddies-dashboard";

export default function AdminBuddiesPage() {
  return (
    <AdminShell>
      <AdminBuddiesDashboard />
    </AdminShell>
  );
}
