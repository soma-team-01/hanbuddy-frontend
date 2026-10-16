import { PageContainer } from "@/components/layout/PageContainer";
import { BuddyWorkspaceTabs } from "@/components/buddy/BuddyWorkspaceTabs";
import { DashboardContent } from "./dashboard-content";
import { parseDashboardSession, type SessionSearchParams } from "@/lib/buddy-session-navigation";

/** Validates URL session context and remounts dashboard state when navigation selects another session. */
export default async function DashboardPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<SessionSearchParams> }>) {
  const initialSession = parseDashboardSession((await searchParams) ?? {});
  return (
    <PageContainer className="flex-1 py-6 md:py-8">
      <main data-testid="dashboard-layout" className="mx-auto w-full max-w-4xl">
        <BuddyWorkspaceTabs active="home" />
        <DashboardContent
          key={initialSession ? `${initialSession.date}:${initialSession.scheduleId}` : "default"}
          initialSession={initialSession}
        />
      </main>
    </PageContainer>
  );
}
