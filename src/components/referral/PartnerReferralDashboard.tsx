"use client";
import { useQuery } from "@tanstack/react-query";
import { myActivitiesQueryOptions } from "@/lib/query/buddy";
import { ReferralApplicants, ReferralError } from "./ReferralApplicants";
export function PartnerReferralDashboard() {
  const query = useQuery(myActivitiesQueryOptions());
  if (query.isPending) return <p>불러오는 중…</p>;
  if (query.error) return <ReferralError error={query.error} retry={() => void query.refetch()} />;
  return (
    <ReferralApplicants activities={query.data?.filter((a) => a.activityType === "REFERRAL")} />
  );
}
