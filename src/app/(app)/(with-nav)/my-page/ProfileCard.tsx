"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useMyProfile } from "@/lib/api/useMyProfile";

export function ProfileCard() {
  const result = useMyProfile();
  let content: ReactNode;

  if (result === null || result.status === "unauthenticated") {
    content = (
      <>
        <span aria-hidden className="size-[72px] shrink-0 animate-pulse rounded-full bg-sand" />
        <div aria-hidden className="flex flex-col gap-2">
          <span className="h-6 w-36 animate-pulse rounded bg-sand" />
          <span className="h-4 w-24 animate-pulse rounded bg-sand" />
        </div>
      </>
    );
  } else if (result.status === "error") {
    content = (
      <p role="alert" className="text-sm text-danger">
        {result.message}
      </p>
    );
  } else {
    content = (
      <>
        <Avatar name={result.profile.name} src={result.profile.profileImageUrl} size={72} />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{result.profile.name}</h1>
          <Link href="/my-page/edit" className="mt-1 flex items-center gap-1 text-sm text-earth">
            Edit Profile
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <section className="flex items-center gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
      {content}
    </section>
  );
}
