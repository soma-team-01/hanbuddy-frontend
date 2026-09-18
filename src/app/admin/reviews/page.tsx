import { AdminShell } from "@/app/admin/admin-shell";
import { ReviewsDashboard } from "./reviews-dashboard";

export default function AdminReviewsPage() {
  return (
    <AdminShell>
      <ReviewsDashboard />
    </AdminShell>
  );
}
