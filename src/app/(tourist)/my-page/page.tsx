import { TopAppBar } from "@/components/layout/TopAppBar";

export default function MyPage() {
  return (
    <>
      <TopAppBar title="My Page" backHref="/explore" />
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-ink-soft">Coming soon.</p>
      </main>
    </>
  );
}
