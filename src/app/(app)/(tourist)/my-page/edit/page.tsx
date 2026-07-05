"use client";

import Link from "next/link";
import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronDownIcon, PencilIcon } from "@/components/ui/icons";

const COUNTRY_CODES = ["+1 (US)", "+33 (FR)", "+65 (SG)", "+82 (KR)"] as const;
const MESSAGING_APPS = ["WhatsApp", "Line", "WeChat", "KakaoTalk"] as const;

export default function EditProfilePage() {
  const [selectedApps, setSelectedApps] = useState<ReadonlySet<string>>(
    new Set(["WhatsApp", "WeChat"]),
  );

  function toggleApp(app: string) {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(app)) {
        next.delete(app);
      } else {
        next.add(app);
      }
      return next;
    });
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
          <p className="text-ink">Tap to update photo</p>
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
            <label className="col-span-3 flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Nationality</span>
              <span className="relative">
                <select
                  defaultValue="United States"
                  className="w-full appearance-none rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
                >
                  <option>United States</option>
                  <option>France</option>
                  <option>Japan</option>
                  <option>Singapore</option>
                  <option>South Korea</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" />
              </span>
            </label>
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
            <span className="text-sm font-medium text-ink">Global Phone Number</span>
            <div className="flex gap-2">
              <span className="relative shrink-0">
                <select
                  defaultValue={COUNTRY_CODES[0]}
                  aria-label="Country code"
                  className="appearance-none rounded-xl border border-line bg-chip py-3.5 pr-9 pl-4 text-base text-ink"
                >
                  {COUNTRY_CODES.map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink" />
              </span>
              <input
                type="tel"
                defaultValue="555-0198"
                aria-label="Global phone number"
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
              />
            </div>
          </div>
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
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium text-ink">Preferred Messaging Apps</h3>
            <p className="mt-1 text-ink-soft">Select the apps you use to communicate.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {MESSAGING_APPS.map((app) => {
              const isSelected = selectedApps.has(app);
              return (
                <button
                  key={app}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleApp(app)}
                  className={`rounded-full px-4 py-2.5 font-display text-sm font-semibold ${
                    isSelected
                      ? "bg-forest-soft text-cream"
                      : "border border-line-strong bg-white text-ink-soft"
                  }`}
                >
                  {app}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
