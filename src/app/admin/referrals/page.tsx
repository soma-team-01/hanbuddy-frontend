import { AdminShell } from "@/app/admin/admin-shell";
import { ReferralDashboard } from "./referral-dashboard";
export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ activityId?: string }>;
}) {
  const { activityId } = await searchParams;
  const id =
    activityId && /^[1-9]\d*$/.test(activityId) && Number.isSafeInteger(Number(activityId))
      ? Number(activityId)
      : undefined;
  return (
    <AdminShell>
      <ReferralDashboard initialActivityId={id} />
    </AdminShell>
  );
}
