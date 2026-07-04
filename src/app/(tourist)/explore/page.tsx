import { TopAppBar } from "@/components/layout/TopAppBar";
import { mockActivities } from "@/lib/mock-activities";
import { ActivityFeed } from "./activity-feed";

export default function ExplorePage() {
  return (
    <>
      <TopAppBar backHref="/" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ActivityFeed activities={mockActivities} />
      </main>
    </>
  );
}
