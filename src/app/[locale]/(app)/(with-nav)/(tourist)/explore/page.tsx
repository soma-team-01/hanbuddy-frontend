import { TopAppBar } from "@/components/layout/TopAppBar";
import { ActivityFeed } from "./activity-feed";

export default function ExplorePage() {
  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ActivityFeed />
      </main>
    </>
  );
}
