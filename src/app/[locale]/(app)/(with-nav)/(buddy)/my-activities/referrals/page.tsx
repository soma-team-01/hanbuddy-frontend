import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartnerReferralDashboard } from "@/components/referral/PartnerReferralDashboard";
export default function PartnerReferralsPage() {
  return (
    <>
      <PageHeader title="제휴 신청 내역" backHref="/my-activities" />
      <PageContainer className="py-6">
        <PartnerReferralDashboard />
      </PageContainer>
    </>
  );
}
