"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/ui/ActivityCard";
import type { Activity, ActivityCategory } from "@/types/activity";

const FILTERS: { key: "all" | ActivityCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "nearby", label: "Nearby" },
  { key: "popular", label: "Popular" },
  { key: "cultural", label: "Cultural" },
  { key: "food", label: "Food" },
];

export function ActivityFeed({ activities }: Readonly<{ activities: Activity[] }>) {
  const [filter, setFilter] = useState<"all" | ActivityCategory>("all");

  const visibleActivities =
    filter === "all"
      ? activities
      : activities.filter((activity) => activity.categories.includes(filter));

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4">
        {FILTERS.map(({ key, label }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-semibold ${
                isActive
                  ? "bg-forest-soft text-sage"
                  : "border border-line-strong bg-chip text-ink-soft"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <section className="flex flex-col gap-6" aria-label="Activity feed">
        {visibleActivities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
        {visibleActivities.length === 0 && (
          <p className="py-10 text-center text-ink-soft">No activities in this category yet.</p>
        )}
      </section>
    </div>
  );
}
