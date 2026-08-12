import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <PageContainer className="flex-1 py-6 md:py-8">
      {/* 페이지 제목 없이 캘린더부터 시작하는 한 컬럼 — 운영 정보가 한 화면에 담기도록 압축한다 */}
      <main data-testid="dashboard-layout" className="mx-auto w-full max-w-4xl">
        <DashboardContent />
      </main>
    </PageContainer>
  );
}
