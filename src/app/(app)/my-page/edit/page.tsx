"use client";

import { TopAppBar } from "@/components/layout/TopAppBar";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { EditProfileForm } from "./EditProfileForm";

export default function EditProfilePage() {
  const result = useMyProfile();

  if (result?.status === "success") {
    return <EditProfileForm profile={result.profile} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopAppBar backHref="/my-page" />
      <main className="flex flex-1 flex-col items-center gap-4 px-4 py-8">
        {result?.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {result.message}
          </p>
        ) : (
          <>
            <span aria-hidden className="size-28 animate-pulse rounded-full bg-sand" />
            <span aria-hidden className="h-6 w-40 animate-pulse rounded bg-sand" />
          </>
        )}
      </main>
    </div>
  );
}
