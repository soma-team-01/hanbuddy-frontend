"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  ArrowRightIcon,
  CameraIcon,
  MessageSquareIcon,
  PhoneIcon,
  UserIcon,
} from "@/components/ui/icons";

const ROLES = [
  { key: "tourist", label: "Tourist" },
  { key: "buddy", label: "Buddy" },
] as const;

const MESSAGING_APPS = [
  { key: "whatsapp", label: "WhatsApp", Icon: MessageSquareIcon },
  { key: "line", label: "Line", Icon: MessageSquareIcon },
  { key: "wechat", label: "WeChat", Icon: MessageSquareIcon },
  { key: "phone", label: "Phone Number", Icon: PhoneIcon },
] as const;

export default function ProfileSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"tourist" | "buddy">("tourist");
  const [nationality, setNationality] = useState("");
  const [messagingApp, setMessagingApp] = useState<string>("line");
  const [messagingCountry, setMessagingCountry] = useState("US");

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
          <p className="text-ink-soft">Upload Photo (Optional)</p>
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
                  onClick={() => setRole(key)}
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
            <CountrySelect value={nationality} onChange={setNationality} ariaLabel="Nationality" />
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
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Contact Methods</h2>
            <p className="mt-1 text-sm text-ink-soft">How would you like buddies to contact you?</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-soft">Korean Phone Number</span>
              <span className="text-xs text-ink-soft/70">Optional</span>
            </div>
            <input
              type="tel"
              placeholder="010-XXXX-XXXX"
              aria-label="Korean phone number"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Preferred Messaging App</span>
            <div className="flex flex-col rounded-xl border border-line bg-white">
              {MESSAGING_APPS.map(({ key, label, Icon }, index) => {
                const isSelected = messagingApp === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setMessagingApp(key)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-left ${
                      index > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-4 items-center justify-center rounded-full border ${
                        isSelected ? "border-forest" : "border-line-strong"
                      }`}
                    >
                      {isSelected && <span className="size-2 rounded-full bg-forest" />}
                    </span>
                    <Icon className="size-5 text-success" />
                    <span className="text-base text-ink">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex gap-2">
              <div className="shrink-0">
                <CountrySelect
                  value={messagingCountry}
                  onChange={setMessagingCountry}
                  display="dialCode"
                  ariaLabel="Messaging country code"
                  triggerClassName="flex items-center gap-2 rounded-xl border border-line bg-chip py-3.5 pr-3 pl-4 text-base text-ink"
                />
              </div>
              <input
                type="text"
                placeholder="Enter ID / Number for selected app"
                aria-label="Messaging app ID or number"
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
              />
            </div>
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
