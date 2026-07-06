"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { COUNTRIES, findCountry } from "@/lib/countries";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/ui/icons";

interface CountrySelectProps {
  /** ISO 3166-1 alpha-2 코드 */
  value: string;
  onChange: (code: string) => void;
  /** 트리거에 표시할 값 - 국적 선택은 name, 전화 국가번호는 dialCode */
  display?: "name" | "dialCode";
  ariaLabel: string;
  triggerClassName?: string;
}

export function CountrySelect({
  value,
  onChange,
  display = "name",
  ariaLabel,
  triggerClassName,
}: Readonly<CountrySelectProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLLIElement>(null);
  const listboxId = useId();

  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        (display === "dialCode" &&
          (c.dialCode.includes(q.startsWith("+") ? q : `+${q}`) ||
            c.dialCode.slice(1).startsWith(q))),
    );
  }, [query, display]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function open() {
    setQuery("");
    setActiveIndex(0);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    // 패널이 닫히면 검색 input이 언마운트되므로 포커스를 트리거로 복귀시킨다
    triggerRef.current?.focus();
  }

  function select(code: string) {
    onChange(code);
    close();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) select(filtered[activeIndex].code);
    } else if (e.key === "Escape") {
      close();
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={
          triggerClassName ??
          "flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden>{selected.flag}</span>
            <span className="truncate">
              {display === "dialCode" ? selected.dialCode : selected.name}
            </span>
          </span>
        ) : (
          <span className="truncate">Select country</span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-ink" />
      </button>

      {isOpen && (
        <>
          {/* 바깥 클릭 시 닫기용 투명 오버레이 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden />
          <div
            className={`absolute left-0 z-20 mt-2 flex max-h-80 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl ${
              display === "dialCode" ? "w-72" : "w-full min-w-64"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <SearchIcon className="size-4 shrink-0 text-ink-soft" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder="Search country"
                aria-label="Search country"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].code}` : undefined
                }
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-soft/60"
              />
            </div>
            <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="overflow-y-auto">
              {filtered.map((country, index) => {
                const isSelected = country.code === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={country.code}
                    id={`${listboxId}-${country.code}`}
                    ref={isActive ? activeOptionRef : undefined}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      onClick={() => select(country.code)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left ${
                        isActive ? "bg-chip" : ""
                      }`}
                    >
                      <span aria-hidden>{country.flag}</span>
                      <span className="min-w-0 flex-1 truncate text-base text-ink">
                        {country.name}
                      </span>
                      {display === "dialCode" && (
                        <span className="shrink-0 text-sm text-ink-soft">{country.dialCode}</span>
                      )}
                      {isSelected && <CheckIcon className="size-4 shrink-0 text-forest" />}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-ink-soft">No countries found</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
