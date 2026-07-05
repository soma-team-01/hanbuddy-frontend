"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { ChevronDownIcon, ImagePlusIcon, MapIcon, UsersIcon } from "@/components/ui/icons";

const CATEGORIES = [
  "Culture & History",
  "Food Tour",
  "Art One-day Class",
  "Nature",
  "Nightlife",
] as const;

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="text-sm font-medium text-ink">{children}</span>;
}

const INPUT_CLASS =
  "border-line text-ink placeholder:text-ink-soft/60 w-full rounded-xl border bg-white px-4 py-3.5 text-base";

export default function CreateActivityPage() {
  const router = useRouter();
  const [includedItems, setIncludedItems] = useState<number[]>([0]);
  const [timeSlots, setTimeSlots] = useState<number[]>([0]);
  const [restrictions, setRestrictions] = useState<number[]>([0]);

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar backHref="/my-activities" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <p className="font-display text-xs font-semibold tracking-widest text-earth uppercase">
            Step 1 of 3
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-forest">Activity Basics</h1>
          <p className="mt-2 text-ink-soft">
            Start by providing the fundamental details of your cultural experience.
          </p>
        </div>

        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-white/60 px-6 py-14 text-ink-soft"
        >
          <ImagePlusIcon className="size-8" />
          <span className="font-display text-sm font-semibold text-ink">
            Click to upload cover photo
          </span>
          <span className="text-xs">PNG, JPG up to 10MB</span>
        </button>

        <label className="flex flex-col gap-2">
          <FieldLabel>Activity Title</FieldLabel>
          <input
            type="text"
            placeholder="e.g., Traditional Tea Ceremony Experience"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Category</FieldLabel>
          <span className="relative">
            <select defaultValue="" className={`${INPUT_CLASS} appearance-none`}>
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" />
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Description</FieldLabel>
          <textarea
            rows={4}
            placeholder="Describe what participants will do and learn..."
            className={`${INPUT_CLASS} resize-none`}
          />
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel>What&apos;s included</FieldLabel>
          {includedItems.map((key) => (
            <input
              key={key}
              type="text"
              placeholder="e.g., 2 types of traditional tea & refreshments"
              aria-label="Included item"
              className={INPUT_CLASS}
            />
          ))}
          <button
            type="button"
            onClick={() => setIncludedItems((items) => [...items, items.length])}
            className="self-start text-sm font-semibold text-earth"
          >
            + Add item
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Availability</FieldLabel>
          {timeSlots.map((key) => (
            <div key={key} className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Date (e.g., July 5th)"
                aria-label="Available date"
                className={INPUT_CLASS}
              />
              <input
                type="text"
                placeholder="Time (e.g., 1:00 PM - 4:00 PM)"
                aria-label="Available time"
                className={INPUT_CLASS}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTimeSlots((slots) => [...slots, slots.length])}
            className="self-start text-sm font-semibold text-earth"
          >
            + Add time slot
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <FieldLabel>Max Capacity</FieldLabel>
          <span className="relative">
            <UsersIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
            <input type="number" placeholder="e.g., 4" className={`${INPUT_CLASS} pl-11`} />
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <FieldLabel>Price per person</FieldLabel>
          <span className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-ink-soft">
              ₩
            </span>
            <input type="number" placeholder="e.g., 50000" className={`${INPUT_CLASS} pl-11`} />
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel>Meeting Point</FieldLabel>
          <input
            type="text"
            placeholder="Enter place name"
            aria-label="Meeting place name"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            placeholder="Enter address (e.g., Bukchon Hanok Village)"
            aria-label="Meeting place address"
            className={INPUT_CLASS}
          />
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-line/60 text-ink-soft">
            <MapIcon className="size-6" />
            <span className="text-sm">Map preview will appear here</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Who cannot join</FieldLabel>
          {restrictions.map((key) => (
            <input
              key={key}
              type="text"
              placeholder="e.g., People with mobility difficulties"
              aria-label="Restriction"
              className={INPUT_CLASS}
            />
          ))}
          <button
            type="button"
            onClick={() => setRestrictions((items) => [...items, items.length])}
            className="self-start text-sm font-semibold text-earth"
          >
            + Add restriction
          </button>
        </div>
      </main>
      <BottomActionBar>
        <button
          type="button"
          onClick={() => router.push("/my-activities")}
          className="h-12 flex-1 rounded-xl border border-line bg-chip font-display text-sm font-semibold text-ink"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => router.push("/my-activities")}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream"
        >
          Next Step
        </button>
      </BottomActionBar>
    </div>
  );
}
