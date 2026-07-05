import { TopAppBar } from "@/components/layout/TopAppBar";
import { mockApplications } from "@/lib/mock-applications";
import { ApplicationList } from "./application-list";

export default function ApplicationsPage() {
  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="font-display text-2xl font-semibold text-forest">My Applications</h1>
        <ApplicationList applications={mockApplications} />
      </main>
    </>
  );
}
