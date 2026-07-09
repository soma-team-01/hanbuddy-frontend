"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
} from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createApplication } from "@/lib/api/applications";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

const MAX_GUESTS = 8;
const SERVICE_FEE_RATE = 0.1;

export function BookingForm({ activity }: Readonly<{ activity: Activity }>) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(activity.sessions[0]?.id ?? "");
  const [guests, setGuests] = useState(2);
  const [agreed, setAgreed] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = activity.price * guests;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const total = subtotal + serviceFee;
  const selectedSession = activity.sessions.find((session) => session.id === sessionId);

  function handleSubmitClick() {
    if (!sessionId) {
      setErrorMessage("신청 가능한 일정을 선택해 주세요.");
      return;
    }
    setErrorMessage("");
    setShowConfirm(true);
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await createApplication({
        activityScheduleId: Number(sessionId),
        guestCount: guests,
        specialRequest: specialRequest.trim() || undefined,
      });

      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      router.replace("/applications");
    } catch {
      setErrorMessage("신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="relative h-48 w-full overflow-hidden rounded-xl">
          <Image
            src={activity.heroImageUrl}
            alt={activity.title}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
          />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-forest">{activity.title}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
          <UserIcon className="size-4" />
          with {activity.host.name}
        </p>
        {activity.rating !== undefined ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
            <StarIcon className="size-4" />
            <span className="font-display font-semibold">{activity.rating.toFixed(1)}</span>
            {activity.reviewCount !== undefined ? (
              <span className="text-ink-soft">({activity.reviewCount} reviews)</span>
            ) : null}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
          When are you going?
        </h2>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-ink-soft">Datetime</span>
          <span className="relative">
            <select
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              className="w-full appearance-none rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
            >
              {activity.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.dateLabel} {session.timeLabel}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" />
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
          How many people?
        </h2>
        <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
          <span className="text-base text-ink">Number of guests</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Decrease guests"
              disabled={guests <= 1}
              onClick={() => setGuests((count) => Math.max(1, count - 1))}
              className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink disabled:opacity-40"
            >
              <MinusIcon className="size-4" />
            </button>
            <span className="w-5 text-center font-display text-base font-semibold text-ink">
              {guests}
            </span>
            <button
              type="button"
              aria-label="Increase guests"
              disabled={guests >= MAX_GUESTS}
              onClick={() => setGuests((count) => Math.min(MAX_GUESTS, count + 1))}
              className="flex size-8 items-center justify-center rounded-full border border-line-strong text-ink disabled:opacity-40"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="border-b border-line pb-3 text-base font-medium text-ink">
          Special Requests
        </h2>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-ink-soft">
            Dietary restrictions, accessibility needs, etc. (Optional)
          </span>
          <textarea
            rows={3}
            placeholder="Let your guide know..."
            value={specialRequest}
            onChange={(event) => setSpecialRequest(event.target.value)}
            className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-chip p-5">
        <h2 className="text-base font-medium text-ink">Price details</h2>
        <div className="flex items-center justify-between text-sm text-ink">
          <span>
            {formatKrw(activity.price)} x {guests} guests
          </span>
          <span>{formatKrw(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-ink">
          <span>Service fee</span>
          <span>{formatKrw(serviceFee)}</span>
        </div>
        <div className="h-px w-full bg-line" aria-hidden />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Total (KRW)</span>
          <span className="font-display text-2xl font-bold text-forest">{formatKrw(total)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-base text-ink">Refunds are only available until a day before.</p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="size-5 rounded accent-forest"
          />
          <span className="text-base text-ink">I agree to the terms above.</span>
        </label>
      </section>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {errorMessage}
        </p>
      )}

      <BottomActionBar>
        <button
          type="button"
          disabled={!agreed || isSubmitting}
          onClick={handleSubmitClick}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest font-display text-base font-semibold text-cream disabled:opacity-40"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
          <ArrowRightIcon className="size-4" />
        </button>
      </BottomActionBar>

      {showConfirm && (
        <ConfirmDialog
          title="Submit this application?"
          confirmLabel="Submit"
          onConfirm={() => {
            setShowConfirm(false);
            void handleSubmit();
          }}
          onClose={() => setShowConfirm(false)}
        >
          <dl className="flex flex-col gap-2 rounded-xl bg-chip p-4 text-sm text-ink">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-soft">Activity</dt>
              <dd className="truncate font-medium">{activity.title}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-soft">When</dt>
              <dd>
                {selectedSession
                  ? `${selectedSession.dateLabel} ${selectedSession.timeLabel}`
                  : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-ink-soft">Guests</dt>
              <dd>{guests} guests</dd>
            </div>
            <div className="flex justify-between gap-4 font-display font-semibold">
              <dt>Total</dt>
              <dd>{formatKrw(total)}</dd>
            </div>
          </dl>
        </ConfirmDialog>
      )}
    </main>
  );
}
