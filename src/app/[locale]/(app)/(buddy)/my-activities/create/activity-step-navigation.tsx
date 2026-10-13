"use client";

import { useEffect, useRef } from "react";
import { CheckIcon } from "@/components/ui/icons";

/** Touch-scrollable direct navigation; validation belongs to preview and submission. */
export function ActivityStepNavigation({
  groups,
  current,
  label,
  disabled,
  onNavigate,
}: Readonly<{
  groups: readonly {
    id: string;
    label: string;
    steps: readonly { id: string; label: string; complete?: boolean }[];
  }[];
  current: string;
  label: string;
  disabled: boolean;
  onNavigate: (id: string) => void;
}>) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeStepRef = useRef<HTMLButtonElement>(null);
  const currentGroup = groups.find((group) => group.steps.some((step) => step.id === current));
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
      behavior: "instant",
    });
    activeStepRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "center",
      behavior: "instant",
    });
  }, [current]);

  return (
    <nav aria-label={label} className="shrink-0 border-b border-line-soft bg-canvas-soft lg:hidden">
      <ol className="flex [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-4 pt-1 [&::-webkit-scrollbar]:hidden">
        {groups.map((item, index) => {
          const active = item.id === currentGroup?.id;
          const complete = item.steps.every((step) => step.complete);
          return (
            <li key={item.id} className="shrink-0">
              <button
                ref={active ? activeRef : undefined}
                type="button"
                aria-label={`${index + 1}. ${item.label}`}
                aria-current={active ? "step" : undefined}
                disabled={disabled}
                onClick={() => onNavigate(item.steps[0].id)}
                className={`flex min-h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-1 text-xs whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary disabled:opacity-50 ${active ? "border-primary font-bold text-primary-strong" : "border-transparent font-medium text-muted hover:text-primary-strong"}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${complete ? `border-primary bg-primary text-on-primary ${active ? "" : "opacity-75 saturate-50"}` : active ? "border-primary text-primary" : "border-line-strong text-muted"}`}
                >
                  {complete ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="leading-4 break-keep">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {currentGroup && currentGroup.steps.length > 1 ? (
        <ol className="flex [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [&::-webkit-scrollbar]:hidden">
          {currentGroup.steps.map((step) => {
            const active = step.id === current;
            return (
              <li key={step.id} className="shrink-0">
                <button
                  ref={active ? activeStepRef : undefined}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  disabled={disabled}
                  onClick={() => onNavigate(step.id)}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary disabled:opacity-50 ${active ? "border-primary text-primary-strong" : "border-transparent text-muted hover:text-primary-strong"}`}
                >
                  {step.label}
                  {step.complete ? (
                    <CheckIcon aria-hidden="true" className="size-3 shrink-0 text-primary" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </nav>
  );
}
