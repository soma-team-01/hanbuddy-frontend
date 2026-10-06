"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./about.module.css";

export const ALBUM_INTERVAL_MS = 4000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches;
}

export interface AlbumPhoto {
  /** 썸네일과 큰 사진에 붙는 날짜 표식(예: 09.12). 버튼 이름으로도 쓴다. */
  readonly label: string;
  readonly src: string;
  readonly alt: string;
  /** 4:3 상자 안 초점. Tailwind object-position 클래스. */
  readonly position?: string;
}

interface SeptemberAlbumProps {
  readonly label: string;
  readonly photos: readonly AlbumPhoto[];
}

// 9월의 여러 밤을 한 자리에서 보여주는 앨범. 큰 사진이 4초마다 바뀌고 아래 썸네일이 지금 사진을 표시한다.
// 썸네일을 누르면 그 사진에서 멈춘다. 화면 밖, 포인터·포커스가 올라간 동안, 동작 줄이기 설정에서는 넘기지 않는다.
export function SeptemberAlbum({ label, photos }: SeptemberAlbumProps) {
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  // 서버 렌더에서는 동작을 줄인 것으로 보고 넘기지 않는다. 브라우저에서 실제 설정을 읽는다.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => true,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const playing = !stopped && !hovered && !focused && visible && !reducedMotion;

  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % photos.length),
      ALBUM_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, active, photos.length]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-panel md:rounded-[1.5rem]">
        {photos.map((photo, index) => {
          const isActive = index === active;
          return (
            <div
              key={photo.src}
              data-active={isActive}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 540px, (min-width: 768px) 640px, 90vw"
                className={`object-cover ${photo.position ?? "object-center"}`}
              />
            </div>
          );
        })}
        <span
          aria-hidden
          className="absolute top-3 left-3 rounded-full bg-ink/80 px-3 py-1 font-display text-xs font-bold tracking-[0.12em] text-on-primary backdrop-blur-sm"
        >
          {photos[active]?.label}
        </span>
      </div>

      <ul
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}
      >
        {photos.map((photo, index) => {
          const isActive = index === active;
          return (
            <li key={photo.src}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setActive(index);
                  setStopped(true);
                }}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-panel transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:rounded-xl ${
                  isActive
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 110px, 18vw"
                  className={`object-cover ${photo.position ?? "object-center"}`}
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/85 to-transparent px-1.5 pt-4 pb-1 text-left font-display text-[0.65rem] font-bold tracking-[0.06em] text-on-primary sm:text-xs">
                  {photo.label}
                </span>
                {/* 자동으로 넘어가는 동안 다음 사진까지 남은 시간을 막대로 보여준다. */}
                {isActive && playing ? (
                  <span
                    key={active}
                    aria-hidden
                    className={`absolute inset-x-0 bottom-0 h-1 origin-left bg-primary ${styles.albumProgress}`}
                    style={{ animationDuration: `${ALBUM_INTERVAL_MS}ms` }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
