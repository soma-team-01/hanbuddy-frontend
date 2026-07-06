"use client";

import Link from "next/link";
import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessagingAppField } from "@/components/ui/MessagingAppField";
import { PencilIcon } from "@/components/ui/icons";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";

export default function EditProfilePage() {
  const [messagingApp, setMessagingApp] = useState<string>("whatsapp");
  const [messagingContact, setMessagingContact] = useState("");
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync("US");

  function handleMessagingAppChange(key: string) {
    setMessagingApp(key);
    // 전화번호형 <-> ID형 값이 섞이지 않도록 앱 전환 시 연락처 입력을 비운다
    setMessagingContact("");
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
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Preferred Messaging App</span>
            <MessagingAppField
              app={messagingApp}
              onAppChange={handleMessagingAppChange}
              country={messagingCountry}
              onCountryChange={handleMessagingCountryChange}
              contactValue={messagingContact}
              onContactChange={setMessagingContact}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
