import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold text-forest">HanBuddy</h1>
      <Link
        href="/login"
        className="rounded-full bg-forest px-8 py-3 font-display font-semibold text-cream"
      >
        Get started
      </Link>
    </main>
  );
}
