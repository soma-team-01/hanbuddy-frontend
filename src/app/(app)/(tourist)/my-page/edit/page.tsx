"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessagingAppField } from "@/components/ui/MessagingAppField";
import { PencilIcon } from "@/components/ui/icons";

export default function EditProfilePage() {
  const [nationality, setNationality] = useState("US");
  const [messagingApp, setMessagingApp] = useState<string>("whatsapp");
  const [messagingCountry, setMessagingCountry] = useState("US");
  // 사용자가 국가번호를 직접 고르기 전까지만 국적 선택을 기본값으로 따라간다
  const messagingCountryTouched = useRef(false);

  function handleNationalityChange(code: string) {
    setNationality(code);
    if (!messagingCountryTouched.current) setMessagingCountry(code);
  }

  function handleMessagingCountryChange(code: string) {
    messagingCountryTouched.current = true;
    setMessagingCountry(code);
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopAppBar
        backHref="/my-page"
        action={
          <Link href="/my-page" className="font-display text-sm font-semibold text-forest">
            Save
          </Link>
        }
      />
      <main className="flex flex-1 flex-col gap-8 px-4 py-8">
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name="Sarah Jenkins" size={112} />
            <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-forest text-cream">
              <PencilIcon className="size-4" />
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Full Name</span>
            <input
              type="text"
              defaultValue="Sarah Jenkins"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
            />
          </label>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Nationality</span>
              <CountrySelect
                value={nationality}
                onChange={handleNationalityChange}
                ariaLabel="Nationality"
              />
            </div>
            <label className="col-span-2 flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Age</span>
              <input
                type="number"
                defaultValue={28}
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
              />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Contact Details</h2>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">
              Korean Phone Number <span className="font-normal text-ink-soft">(Optional)</span>
            </span>
            <input
              type="tel"
              placeholder="010-XXXX-XXXX"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Preferred Messaging App</span>
            <MessagingAppField
              app={messagingApp}
              onAppChange={setMessagingApp}
              country={messagingCountry}
              onCountryChange={handleMessagingCountryChange}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
