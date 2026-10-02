import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/admin-shell";
import { positiveReviewId } from "@/lib/admin/reviews";
import { ReviewDetail } from "../review-detail";

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  try {
    positiveReviewId(reviewId);
  } catch {
    notFound();
  }
  return (
    <AdminShell>
      <ReviewDetail reviewId={reviewId} />
    </AdminShell>
  );
}
