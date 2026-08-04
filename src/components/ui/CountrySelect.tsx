"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRIES } from "@/lib/countries";
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

interface PanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

export function CountrySelect({
  value,
  onChange,
  display = "name",
  ariaLabel,
  triggerClassName,
}: Readonly<CountrySelectProps>) {
  const locale = useLocale();
  const t = useTranslations("Country");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeOptionRef = useRef<HTMLLIElement>(null);
  const listboxId = useId();

  const localizedCountries = useMemo(() => {
    const displayNames = new Intl.DisplayNames(locale === "ko" ? "ko-KR" : "en-US", {
      type: "region",
    });

    return COUNTRIES.map((country) => {
      const localizedName = displayNames.of(country.code);
      return {
        ...country,
        localizedName:
          !localizedName || localizedName.toUpperCase() === country.code
            ? country.name
            : localizedName,
      };
    });
  }, [locale]);

  const selected = localizedCountries.find((country) => country.code === value.toUpperCase());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localizedCountries;
    return localizedCountries.filter(
      (c) =>
        c.localizedName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        (display === "dialCode" &&
          (c.dialCode.includes(q.startsWith("+") ? q : `+${q}`) ||
            c.dialCode.slice(1).startsWith(q))),
    );
  }, [query, display, localizedCountries]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportPadding = 8;
    const panelGap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - viewportPadding * 2);
    const preferredWidth = display === "dialCode" ? 288 : Math.max(triggerRect.width, 256);
    const width = Math.min(preferredWidth, availableWidth);
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const availableBelow = window.innerHeight - triggerRect.bottom - panelGap - viewportPadding;
    const availableAbove = triggerRect.top - panelGap - viewportPadding;
    const opensAbove = availableBelow < 240 && availableAbove > availableBelow;
    const availableHeight = opensAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(96, Math.min(320, availableHeight));

    setPanelPosition({
      left,
      width,
      maxHeight,
      ...(opensAbove
        ? { bottom: window.innerHeight - triggerRect.top + panelGap }
        : { top: triggerRect.bottom + panelGap }),
    });
  }, [display]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function open() {
    setQuery("");
    setActiveIndex(0);
    updatePanelPosition();
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setPanelPosition(null);
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
        onClick={() => (isOpen ? close() : open())}
        className={
          triggerClassName ??
          "flex w-full items-center justify-between gap-2 rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink transition-colors hover:border-line-strong"
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden>{selected.flag}</span>
            <span className="truncate">
              {display === "dialCode" ? selected.dialCode : selected.localizedName}
            </span>
          </span>
        ) : (
          <span className="truncate">{t("select")}</span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-ink" />
      </button>

      {isOpen && panelPosition
        ? createPortal(
            <>
              {/* 포털로 렌더링해 상위 overflow 컨테이너에 잘리지 않게 한다. */}
              <div
                data-testid="country-select-backdrop"
                className="fixed inset-0 z-[90]"
                onClick={close}
                aria-hidden
              />
              <div
                data-testid="country-select-panel"
                style={panelPosition}
                className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-line-soft bg-panel shadow-xl"
              >
                <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
                  <SearchIcon className="size-4 shrink-0 text-muted" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    placeholder={t("search")}
                    aria-label={t("search")}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-activedescendant={
                      filtered[activeIndex]
                        ? `${listboxId}-${filtered[activeIndex].code}`
                        : undefined
                    }
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
                  />
                </div>
                <ul
                  id={listboxId}
                  role="listbox"
                  aria-label={ariaLabel}
                  className="overflow-y-auto"
                >
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
                          // aria-activedescendant 패턴: 포커스는 검색 input이 유지하고 옵션은 탭 순서에서 제외
                          tabIndex={-1}
                          onClick={() => select(country.code)}
                          onMouseMove={() => setActiveIndex(index)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left ${
                            isActive ? "bg-primary-soft" : ""
                          }`}
                        >
                          <span aria-hidden>{country.flag}</span>
                          <span className="min-w-0 flex-1 truncate text-base text-ink">
                            {country.localizedName}
                          </span>
                          {display === "dialCode" && (
                            <span className="shrink-0 text-sm text-muted">{country.dialCode}</span>
                          )}
                          {isSelected && (
                            <CheckIcon className="size-4 shrink-0 text-primary-strong" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="px-3 py-4 text-center text-sm text-muted">{t("noResults")}</li>
                  )}
                </ul>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
