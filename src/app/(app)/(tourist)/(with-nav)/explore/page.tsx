import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { mockActivities } from "@/lib/mock-activities";

export default function ExplorePage() {
  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        {mockActivities.map((activity) => (
          <Link key={activity.id} href={`/activities/${activity.id}`}>
            <ActivityCard activity={activity} />
          </Link>
        ))}
      </main>
    </>
  );
}
