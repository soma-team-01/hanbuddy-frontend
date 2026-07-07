import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { PlusIcon } from "@/components/ui/icons";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Hello, Ji-hun 👋</h1>

        <DashboardContent />

        <section className="flex flex-col gap-4 rounded-2xl bg-chip p-5">
          <h2 className="font-display text-xl font-semibold text-ink">Quick Actions</h2>
          <Link
            href="/my-activities/create"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-soft font-display text-sm font-semibold text-sage"
          >
            <PlusIcon className="size-4" />
            Create Activity
          </Link>
        </section>
      </main>
    </>
  );
}
