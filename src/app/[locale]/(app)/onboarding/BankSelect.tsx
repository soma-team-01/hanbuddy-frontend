"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/ui/icons";
import { BANKS } from "@/lib/auth/signup-extra";
import { ONBOARDING_SELECT_TRIGGER } from "./onboarding-field-styles";

const banks = Object.entries(BANKS);
const normalize = (text: string) => text.normalize("NFKC").replace(/\s/g, "").toLowerCase();

export function BankSelect({
  value,
  onChange,
  invalid,
  describedBy,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}>) {
  const t = useTranslations("SignupExtra");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const activeOption = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  }>({ left: 0, width: 0, maxHeight: 272 });
  const filtered = banks.filter(([, name]) => normalize(name).includes(normalize(query)));
  const selected = banks.find(([bank]) => bank === value);

  const updatePosition = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const opensAbove = below < 272 && above > below;
    const width = Math.min(Math.max(rect.width, 256), Math.max(0, window.innerWidth - 16));
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.max(0, Math.min(272, opensAbove ? above : below)),
      ...(opensAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent | FocusEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) {
        if (event.type === "pointerdown") trigger.current?.focus();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (open) activeOption.current?.scrollIntoView({ block: "nearest" });
  }, [open, active, query]);

  function show() {
    setQuery("");
    setActive(
      Math.max(
        0,
        banks.findIndex(([bank]) => bank === value),
      ),
    );
    updatePosition();
    setOpen(true);
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function choose(bank: string) {
    onChange(bank);
    close();
  }
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        Math.max(0, Math.min(filtered.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active][0]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      // Resume the form's tab order from the trigger, not from the body portal.
      close();
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        value={value}
        aria-label={t("bankLabel")}
        aria-required="true"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
        className={`focus-border-only ${ONBOARDING_SELECT_TRIGGER} gap-1 px-2 md:gap-2 md:px-4`}
      >
        <span className="truncate">{selected?.[1] ?? t("bankPlaceholder")}</span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-ink" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            style={position}
            data-testid="bank-select-panel"
            className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-line-soft bg-canvas-soft shadow-lg"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 py-2">
              <SearchIcon aria-hidden className="size-4 shrink-0 text-muted" />
              <input
                ref={search}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-label={t("bankSearch")}
                placeholder={t("bankSearch")}
                value={query}
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls={id}
                aria-activedescendant={
                  filtered[active] ? `${id}-${filtered[active][0]}` : undefined
                }
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="focus-border-only w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
              />
            </div>
            <div
              id={id}
              role="listbox"
              aria-label={t("bankLabel")}
              className="min-h-0 overflow-y-auto overscroll-contain py-1"
            >
              {filtered.map(([bank, name], index) => (
                <button
                  key={bank}
                  id={`${id}-${bank}`}
                  ref={index === active ? activeOption : undefined}
                  type="button"
                  role="option"
                  value={bank}
                  tabIndex={-1}
                  aria-selected={bank === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(bank)}
                  className={`flex h-9 w-full items-center justify-between gap-2 px-3 text-left text-sm ${index === active ? "font-semibold text-primary-strong underline decoration-primary underline-offset-4" : "text-ink"}`}
                >
                  <span className="truncate">{name}</span>
                  {bank === value && (
                    <CheckIcon aria-hidden className="size-3 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <p role="status" className="px-3 py-4 text-center text-sm text-muted">
                {t("bankNoResults")}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
