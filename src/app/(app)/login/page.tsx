import Link from "next/link";
import { GoogleIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-line bg-white px-6 py-10 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <h1 className="font-display text-3xl leading-tight font-semibold text-forest">
            Welcome to HanBuddy
          </h1>
          <p className="mt-4 text-ink-soft">
            Tell us about yourself to find the perfect local experience.
          </p>
          <Link
            href="/api/auth/google/start"
            prefetch={false}
            className="mt-10 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-white font-display text-sm font-semibold text-ink transition-colors hover:bg-chip"
          >
            <GoogleIcon className="size-5" />
            Continue with Google
          </Link>
        </div>
      </div>
      <footer className="flex flex-col items-center gap-3 border-t border-line px-6 py-8 text-center">
        <p className="font-display text-sm font-semibold text-forest">HanBuddy</p>
        <div className="flex justify-center gap-6 text-xs text-ink-soft">
          <span className="underline">Privacy Policy</span>
          <span className="underline">Terms of Service</span>
          <span className="underline">Help Center</span>
        </div>
        <p className="text-xs text-ink-soft">© 2026 HanBuddy. All rights reserved.</p>
      </footer>
    </main>
  );
}
