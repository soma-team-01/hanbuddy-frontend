import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { PlusIcon } from "@/components/ui/icons";
import { MyActivitiesContent } from "./my-activities-content";

export default function MyActivitiesPage() {
  return (
    <>
      <TopAppBar backHref="/dashboard" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">My Activities</h1>
          <p className="mt-1 text-ink-soft">Manage your hosted cultural experiences.</p>
        </div>

        <Link
          href="/my-activities/create"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest font-display text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          <PlusIcon className="size-4" />
          Create Activity
        </Link>

        <MyActivitiesContent />
      </main>
    </>
  );
}
