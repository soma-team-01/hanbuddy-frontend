"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  HomeIcon,
  LeafIcon,
  MartiniIcon,
  PaletteIcon,
  PlaneIcon,
  ShoppingBagIcon,
  UtensilsIcon,
} from "@/components/ui/icons";

const INTERESTS = [
  { key: "food", label: "Food", Icon: UtensilsIcon },
  { key: "art-culture", label: "Art & Culture", Icon: PaletteIcon },
  { key: "nature", label: "Nature", Icon: LeafIcon },
  { key: "nightlife", label: "Nightlife", Icon: MartiniIcon },
  { key: "shopping", label: "Shopping", Icon: ShoppingBagIcon },
] as const;

const LANGUAGES = ["English", "한국어", "日本語", "中文"] as const;

const RESIDENCIES = [
  { key: "visiting", label: "Just Visiting", Icon: PlaneIcon },
  { key: "resident", label: "Resident", Icon: HomeIcon },
] as const;

export default function OnboardingPage() {
  const [interests, setInterests] = useState<ReadonlySet<string>>(new Set());
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [residency, setResidency] = useState<string | null>(null);

  function toggleInterest(key: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <main className="flex flex-1 flex-col p-2">
      <div className="flex flex-1 flex-col gap-10 rounded-3xl bg-white px-6 py-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-3xl font-semibold text-forest">Welcome to HanBuddy</h1>
          <p className="text-ink-soft">
            Tell us about yourself to find the perfect local experience.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              What are you interested in?
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Select all that apply.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {INTERESTS.map(({ key, label, Icon }) => {
              const isSelected = interests.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleInterest(key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-display text-sm font-semibold ${
                    isSelected
                      ? "bg-forest-soft text-cream"
                      : "border border-line-strong bg-chip text-ink-soft"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Preferred Language</h2>
          <div className="relative">
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label="Preferred language"
              className="w-full appearance-none rounded-xl border border-line bg-chip px-4 py-3.5 text-base text-ink"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Are you currently living in Korea?
          </h2>
          <div className="flex gap-4">
            {RESIDENCIES.map(({ key, label, Icon }) => {
              const isSelected = residency === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setResidency(key)}
                  className={`flex flex-1 flex-col items-center gap-3 rounded-xl border bg-cream/60 px-4 py-6 ${
                    isSelected ? "border-forest-soft" : "border-line"
                  }`}
                >
                  <Icon className="size-6 text-forest" />
                  <span className="font-display text-sm font-semibold text-ink">{label}</span>
                  <span
                    aria-hidden
                    className={`flex size-4 items-center justify-center rounded-full border ${
                      isSelected ? "border-forest-soft" : "border-line-strong"
                    }`}
                  >
                    {isSelected && <span className="size-2 rounded-full bg-forest-soft" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="mt-auto flex flex-col border-t border-line pt-6">
          <Link
            href="/explore"
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-forest font-display text-base font-semibold text-cream"
          >
            Start Exploring
            <ArrowRightIcon className="size-4" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
