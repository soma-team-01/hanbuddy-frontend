import { PageContainer } from "@/components/layout/PageContainer";
import { BuddyWorkspaceTabs } from "@/components/buddy/BuddyWorkspaceTabs";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <PageContainer className="flex-1 py-6 md:py-8">
      <main data-testid="dashboard-layout" className="mx-auto w-full max-w-4xl">
        <BuddyWorkspaceTabs active="home" />
        <DashboardContent />
      </main>
    </PageContainer>
  );
}
