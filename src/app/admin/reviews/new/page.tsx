import { AdminShell } from "@/app/admin/admin-shell";
import { ImportedReviewForm } from "../imported-review-form";

export default function NewImportedReviewPage() {
  return (
    <AdminShell>
      <ImportedReviewForm />
    </AdminShell>
  );
}
