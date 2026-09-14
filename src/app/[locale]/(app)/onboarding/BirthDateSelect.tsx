"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { ONBOARDING_SELECT_TRIGGER } from "./onboarding-field-styles";

type Option = { value: string; label: string; disabled?: boolean };

export function BirthDateSelect({
  label,
  value,
  options,
  onChange,
  invalid,
  describedBy,
}: Readonly<{
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const activeOption = useRef<HTMLButtonElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 224 });
  const selected = options.find((option) => option.value === value);

  const updatePosition = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const opensAbove = below < 224 && above > below;
    const maxHeight = Math.max(0, Math.min(224, opensAbove ? above : below));
    setPosition({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: opensAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (open) activeOption.current?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show(index = options.findIndex((option) => option.value === value && !option.disabled)) {
    updatePosition();
    setActive(index < 0 ? options.findIndex((option) => !option.disabled) : index);
    search.current = { text: "", time: 0 };
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function navigate(key: string) {
    const direction = key === "ArrowUp" || key === "End" ? -1 : 1;
    let index = active + direction;
    if (key === "Home") index = 0;
    if (key === "End") index = options.length - 1;
    while (options[index]?.disabled) index += direction;
    if (!open && (key === "ArrowDown" || key === "ArrowUp")) show();
    else if (options[index]) show(index);
  }

  function typeahead(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    const text =
      (event.timeStamp - search.current.time < 1000 ? search.current.text : "") +
      event.key.toLowerCase();
    search.current = { text, time: event.timeStamp };
    const index = options.findIndex(
      (option) =>
        !option.disabled &&
        (option.label.toLowerCase().startsWith(text) || option.value.startsWith(text)),
    );
    if (index < 0) return;
    event.preventDefault();
    updatePosition();
    setOpen(true);
    setActive(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
      }
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      navigate(event.key);
      return;
    }
    typeahead(event);
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        value={value}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => {
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        className={`focus-border-only ${ONBOARDING_SELECT_TRIGGER} gap-1 px-2 sm:gap-2 sm:px-4`}
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-ink" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="listbox"
            aria-label={label}
            style={position}
            className="fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-line-soft bg-canvas-soft py-1 shadow-lg"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                id={`${id}-${index}`}
                ref={index === active ? activeOption : undefined}
                type="button"
                role="option"
                value={option.value}
                tabIndex={-1}
                aria-selected={option.value === value}
                disabled={option.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (!option.disabled) setActive(index);
                }}
                onClick={() => choose(index)}
                className={`flex h-9 w-full items-center justify-between gap-1 px-2 text-left text-sm disabled:text-muted/40 ${index === active ? "font-semibold text-primary-strong underline decoration-primary underline-offset-4" : "text-ink"}`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <CheckIcon aria-hidden className="size-3 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
