"use client";

import { useEffect, useState } from "react";

interface ReviewCarouselItem {
  readonly event: string;
  readonly meta: string;
  readonly quote: string;
  readonly rating: string;
  readonly starLabel: string;
}

interface ReviewCarouselProps {
  readonly ariaLabel: string;
  readonly nextLabel: string;
  readonly previousLabel: string;
  readonly reviews: readonly ReviewCarouselItem[];
}

export function ReviewCarousel({
  ariaLabel,
  nextLabel,
  previousLabel,
  reviews,
}: ReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionPreference);
    } else {
      mediaQuery.addListener(updateMotionPreference);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateMotionPreference);
      } else {
        mediaQuery.removeListener(updateMotionPreference);
      }
    };
  }, []);

  useEffect(() => {
    if (isPaused || reduceMotion || reviews.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % reviews.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion, reviews.length]);

  if (reviews.length === 0) return null;

  const activeReview = reviews[activeIndex];

  const showPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + reviews.length) % reviews.length);
  };

  const showNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % reviews.length);
  };

  return (
    <div
      aria-label={ariaLabel}
      className="review-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      <article
        key={activeIndex}
        className="review-card-swap flex min-h-80 flex-col justify-between rounded-[2rem] border border-line-soft bg-canvas-soft p-7 shadow-[0_18px_45px_rgba(61,45,43,0.08)] sm:min-h-72 sm:p-10 lg:min-h-80 lg:flex-row lg:items-end lg:gap-12"
      >
        <div className="max-w-4xl">
          <div className="flex items-center gap-3">
            <span
              role="img"
              aria-label={activeReview.starLabel}
              className="tracking-[0.16em] text-primary"
            >
              ★★★★★
            </span>
            <span className="font-display text-sm font-bold text-primary-strong">
              {activeReview.rating}
            </span>
          </div>
          <blockquote className="mt-8 font-display text-2xl leading-tight font-bold tracking-[-0.04em] text-ink sm:text-4xl sm:leading-tight">
            “{activeReview.quote}”
          </blockquote>
        </div>

        <div className="mt-8 shrink-0 border-t border-line-soft pt-5 lg:mt-0 lg:w-56 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <p className="font-display text-sm font-bold text-primary-strong">{activeReview.event}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{activeReview.meta}</p>
        </div>
      </article>

      <div className="mt-5 flex items-center justify-between gap-5">
        <div
          className="flex items-center gap-2"
          aria-label={`${activeIndex + 1} / ${reviews.length}`}
        >
          {reviews.map((review, index) => (
            <button
              key={review.quote}
              type="button"
              aria-label={`${index + 1} ${review.event}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className={`size-2.5 rounded-full transition-[scale,background-color] ${
                index === activeIndex
                  ? "scale-125 bg-primary"
                  : "bg-line-strong hover:bg-primary/60"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={previousLabel}
            onClick={showPrevious}
            className="flex size-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            onClick={showNext}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover"
          >
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
