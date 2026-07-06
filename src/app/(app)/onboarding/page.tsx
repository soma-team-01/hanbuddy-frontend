"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessagingAppField } from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, UserIcon } from "@/components/ui/icons";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";

const ROLES = [
  { key: "tourist", label: "Tourist" },
  { key: "buddy", label: "Buddy" },
] as const;

export default function ProfileSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"tourist" | "buddy">("tourist");
  const [messagingApp, setMessagingApp] = useState<string>("line");
  const [messagingContact, setMessagingContact] = useState("");
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync("");

  function handleRoleChange(key: "tourist" | "buddy") {
    setRole(key);
    // 국가별 번호 <-> 한국 로컬 번호로 값 의미가 달라지므로 역할 전환 시 연락처를 비운다
    setMessagingContact("");
  }

  function handleMessagingAppChange(key: string) {
    setMessagingApp(key);
    // 전화번호형 <-> ID형 값이 섞이지 않도록 앱 전환 시 연락처 입력을 비운다
    setMessagingContact("");
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar closeHref="/" />
      <main className="flex flex-1 flex-col gap-8 px-4 py-8">
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-2xl border border-line bg-sand">
              <UserIcon className="size-9 text-ink-soft" />
            </div>
            <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full bg-forest text-cream">
              <CameraIcon className="size-4" />
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">I am a...</h2>
          <div className="flex overflow-hidden rounded-lg border border-line-strong">
            {ROLES.map(({ key, label }) => {
              const isSelected = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleRoleChange(key)}
                  className={`h-12 flex-1 font-display text-sm font-semibold ${
                    isSelected ? "bg-forest text-cream" : "bg-white text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px w-full bg-line" aria-hidden />

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Personal Information</h2>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Nationality</span>
            <CountrySelect
              value={nationality}
              onChange={handleNationalityChange}
              ariaLabel="Nationality"
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Age</span>
            <input
              type="number"
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
            />
          </label>
        </section>

        <div className="h-px w-full bg-line" aria-hidden />

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Contact Methods</h2>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Preferred Messaging App</span>
            <MessagingAppField
              app={messagingApp}
              onAppChange={handleMessagingAppChange}
              country={messagingCountry}
              onCountryChange={handleMessagingCountryChange}
              contactValue={messagingContact}
              onContactChange={setMessagingContact}
              koreanOnly={role === "buddy"}
            />
          </div>
        </section>
      </main>
      <BottomActionBar>
        <button
          type="button"
          onClick={() => router.push(role === "buddy" ? "/dashboard" : "/explore")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest font-display text-base font-semibold text-cream"
        >
          Complete Registration
          <ArrowRightIcon className="size-4" />
        </button>
      </BottomActionBar>
    </div>
  );
}
