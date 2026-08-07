"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, LogOutIcon } from "@/components/ui/icons";
import {
  ACTIVITY_CREATE_LIMITS,
  ACTIVITY_CREATE_STEPS,
  EMPTY_ACTIVITY_DRAFT,
  getNextActivityCreateStep,
  getPreviousActivityCreateStep,
  getStepIndex,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type DiscountType,
  type ItineraryDraft,
  type PhotoDraft,
  type ScheduleDraft,
  validateActivityCreateStep,
} from "./activity-create-wizard";
import {
  CapacityStep,
  DescriptionStep,
  DiscountStep,
  HostStep,
  InclusionsStep,
  ItineraryStep,
  MeetingStep,
  NameStep,
  PhotoStep,
  PriceStep,
  RestrictionsStep,
  ReviewStep,
  ScheduleStep,
} from "./activity-create-steps";

const MAX_EXPERIENCE_PHOTOS = ACTIVITY_CREATE_LIMITS.photos.max;

const STEP_GROUPS = [
  { key: "intro", steps: ["host"] },
  { key: "activity", steps: ["name", "description", "photos", "itinerary"] },
  { key: "operation", steps: ["meeting", "schedule", "capacity"] },
  { key: "pricing", steps: ["price", "discount"] },
  { key: "policy", steps: ["inclusions", "restrictions"] },
] as const satisfies ReadonlyArray<{
  key: "intro" | "activity" | "operation" | "pricing" | "policy";
  steps: ReadonlyArray<ActivityCreateStep>;
}>;

type DraftTextField = Exclude<
  keyof ActivityCreateDraft,
  "photos" | "itinerary" | "schedules" | "discountType" | "hasNoRestrictions"
>;

interface ActivityCreateLocaleSnapshot {
  currentStep: ActivityCreateStep;
  furthestStepIndex: number;
  draft: ActivityCreateDraft;
  errorKey: ActivityCreateErrorKey | null;
  reviewing: boolean;
  previewComplete: boolean;
  fileSequence: number;
  scheduleSequence: number;
  objectUrls: Set<string>;
}

let activityCreateLocaleSnapshot: ActivityCreateLocaleSnapshot | null = null;

function makeId(prefix: string, sequence: number) {
  return `${prefix}-${Date.now()}-${sequence}`;
}

function createPhotoDraft(file: File, id: string): PhotoDraft {
  return { id, file, previewUrl: URL.createObjectURL(file) };
}

function ProgressRail({
  currentStep,
  furthestStepIndex,
  reviewing,
  getTitle,
  getGroupTitle,
  isStepComplete,
  label,
  onNavigate,
}: Readonly<{
  currentStep: ActivityCreateStep;
  furthestStepIndex: number;
  reviewing: boolean;
  getTitle: (step: ActivityCreateStep) => string;
  getGroupTitle: (group: (typeof STEP_GROUPS)[number]["key"]) => string;
  isStepComplete: (step: ActivityCreateStep) => boolean;
  label: string;
  onNavigate: (step: ActivityCreateStep) => void;
}>) {
  const currentIndex = getStepIndex(currentStep);
  const currentGroupIndex = STEP_GROUPS.findIndex((group) =>
    group.steps.some((step) => step === currentStep),
  );
  const isVisitedAndComplete = (step: ActivityCreateStep) =>
    (reviewing || getStepIndex(step) <= furthestStepIndex) && isStepComplete(step);
  const canNavigateForwardTo = (step: ActivityCreateStep) => {
    const targetIndex = getStepIndex(step);
    if (reviewing || targetIndex <= currentIndex) return true;
    if (targetIndex > furthestStepIndex) return false;
    return ACTIVITY_CREATE_STEPS.slice(0, targetIndex).every(isStepComplete);
  };

  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-primary/15 bg-[#fff] px-7 py-9 lg:block">
      <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
        {currentIndex + 1} / {ACTIVITY_CREATE_STEPS.length}
      </p>
      <ol className="mt-7 space-y-3" aria-label={label}>
        {STEP_GROUPS.map((group, index) => {
          const isCurrent = !reviewing && index === currentGroupIndex;
          const groupSteps: ReadonlyArray<ActivityCreateStep> = group.steps;
          const isComplete = groupSteps.every(isVisitedAndComplete);
          const currentInGroup = isCurrent ? groupSteps.indexOf(currentStep) + 1 : 0;
          const groupTarget = groupSteps[0];
          const groupDisabled = !canNavigateForwardTo(groupTarget);
          return (
            <li key={group.key}>
              <button
                type="button"
                onClick={() => onNavigate(groupTarget)}
                disabled={groupDisabled}
                aria-label={getGroupTitle(group.key)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left text-sm transition ${
                  isCurrent
                    ? "border-primary/70 font-bold text-ink shadow-[0_6px_18px_rgba(209,63,50,0.06)]"
                    : "border-transparent font-medium text-muted enabled:hover:border-primary/30 enabled:hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-45"
                }`}
              >
                <span
                  className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                    isComplete
                      ? "border-primary bg-primary text-white"
                      : isCurrent
                        ? "border-primary bg-white text-primary"
                        : "border-line-strong bg-white text-muted"
                  }`}
                >
                  {isComplete ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${isCurrent ? "text-primary-strong" : ""}`}>
                    {getGroupTitle(group.key)}
                  </span>
                  {isCurrent && group.steps.length > 1 ? (
                    <span className="mt-0.5 block truncate text-xs font-medium text-muted">
                      {getTitle(currentStep)} · {currentInGroup}/{group.steps.length}
                    </span>
                  ) : null}
                </span>
              </button>
              {isCurrent && group.steps.length > 1 ? (
                <ol className="mt-2 ml-6 space-y-1 border-l border-line-soft pl-4">
                  {group.steps.map((step) => {
                    const active = step === currentStep;
                    const complete = isVisitedAndComplete(step);
                    const disabled = !canNavigateForwardTo(step);
                    return (
                      <li key={step}>
                        <button
                          type="button"
                          onClick={() => onNavigate(step)}
                          disabled={disabled}
                          aria-current={active ? "step" : undefined}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-xs transition ${
                            active
                              ? "border-primary/60 font-bold text-primary-strong"
                              : "border-transparent font-medium text-muted enabled:hover:border-primary/25 enabled:hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-45"
                          }`}
                        >
                          <span>{getTitle(step)}</span>
                          {complete ? <CheckIcon className="size-3 shrink-0 text-primary" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

export function CreateActivityForm() {
  const t = useTranslations("CreateActivity");
  const initialSnapshot = activityCreateLocaleSnapshot;
  const [currentStep, setCurrentStep] = useState<ActivityCreateStep>(
    initialSnapshot?.currentStep ?? "host",
  );
  const [furthestStepIndex, setFurthestStepIndex] = useState(
    initialSnapshot?.furthestStepIndex ?? 0,
  );
  const [draft, setDraft] = useState<ActivityCreateDraft>(
    initialSnapshot?.draft ?? EMPTY_ACTIVITY_DRAFT,
  );
  const [errorKey, setErrorKey] = useState<ActivityCreateErrorKey | null>(
    initialSnapshot?.errorKey ?? null,
  );
  const [reviewing, setReviewing] = useState(initialSnapshot?.reviewing ?? false);
  const [previewComplete, setPreviewComplete] = useState(initialSnapshot?.previewComplete ?? false);
  const fileSequence = useRef(initialSnapshot?.fileSequence ?? 0);
  const scheduleSequence = useRef(initialSnapshot?.scheduleSequence ?? 0);
  const objectUrls = useRef(initialSnapshot?.objectUrls ?? new Set<string>());
  const contentRef = useRef<HTMLDivElement>(null);
  const currentIndex = getStepIndex(currentStep);
  const progressIndex = reviewing ? ACTIVITY_CREATE_STEPS.length : currentIndex + 1;

  useEffect(() => {
    const urls = objectUrls.current;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      if (!activityCreateLocaleSnapshot) {
        urls.forEach((url) => URL.revokeObjectURL(url));
      }
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  function preserveForLocaleChange() {
    activityCreateLocaleSnapshot = {
      currentStep,
      furthestStepIndex,
      draft,
      errorKey,
      reviewing,
      previewComplete,
      fileSequence: fileSequence.current,
      scheduleSequence: scheduleSequence.current,
      objectUrls: new Set(objectUrls.current),
    };
  }

  function clearPreservedDraft() {
    activityCreateLocaleSnapshot = null;
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }

  function updateField(field: DraftTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrorKey(null);
  }

  function updateDiscountType(discountType: DiscountType) {
    setDraft((current) => ({
      ...current,
      discountType,
      discountPercent: discountType === "none" ? "" : current.discountPercent,
      discountEndsAt: discountType === "none" ? "" : current.discountEndsAt,
    }));
    setErrorKey(null);
  }

  function updateHasNoRestrictions(hasNoRestrictions: boolean) {
    setDraft((current) => ({
      ...current,
      hasNoRestrictions,
      restrictions: hasNoRestrictions ? "" : current.restrictions,
    }));
    setErrorKey(null);
  }

  function toggleScheduleDate(date: string) {
    setDraft((current) => {
      const exists = current.schedules.some((schedule) => schedule.date === date);
      scheduleSequence.current += 1;
      const schedules = exists
        ? current.schedules.filter((schedule) => schedule.date !== date)
        : [
            ...current.schedules,
            {
              id: makeId(`schedule-${date}`, scheduleSequence.current),
              date,
              startTime: "",
            },
          ].sort((a, b) => a.date.localeCompare(b.date));
      return { ...current, schedules };
    });
    setErrorKey(null);
  }

  function buildSchedulesForDate(
    currentSchedules: ScheduleDraft[],
    date: string,
    startTimes: string[],
  ) {
    const existing = currentSchedules.filter((schedule) => schedule.date === date);
    const uniqueStartTimes = [...new Set(startTimes.filter(Boolean))].sort();

    if (!uniqueStartTimes.length) {
      const emptySchedule = existing.find((schedule) => !schedule.startTime);
      if (emptySchedule) return [emptySchedule];
      scheduleSequence.current += 1;
      return [
        {
          id: makeId(`schedule-${date}`, scheduleSequence.current),
          date,
          startTime: "",
        },
      ];
    }

    return uniqueStartTimes.map((startTime) => {
      const matchingSchedule = existing.find((schedule) => schedule.startTime === startTime);
      if (matchingSchedule) return matchingSchedule;
      scheduleSequence.current += 1;
      return {
        id: makeId(`schedule-${date}`, scheduleSequence.current),
        date,
        startTime,
      };
    });
  }

  function setScheduleTimesForDate(date: string, startTimes: string[]) {
    setDraft((current) => ({
      ...current,
      schedules: [
        ...current.schedules.filter((schedule) => schedule.date !== date),
        ...buildSchedulesForDate(current.schedules, date, startTimes),
      ].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    }));
    setErrorKey(null);
  }

  function applyScheduleTimesToAll(sourceDate: string) {
    setDraft((current) => {
      const dates = [...new Set(current.schedules.map((schedule) => schedule.date))];
      const sourceTimes = current.schedules
        .filter((schedule) => schedule.date === sourceDate && schedule.startTime)
        .map((schedule) => schedule.startTime);
      if (!sourceTimes.length) return current;

      return {
        ...current,
        schedules: dates
          .flatMap((date) => buildSchedulesForDate(current.schedules, date, sourceTimes))
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
      };
    });
    setErrorKey(null);
  }

  function addPhotoFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_EXPERIENCE_PHOTOS - draft.photos.length;
    const additions = Array.from(files)
      .slice(0, remaining)
      .map((file) => {
        fileSequence.current += 1;
        const photo = createPhotoDraft(file, makeId("experience-photo", fileSequence.current));
        objectUrls.current.add(photo.previewUrl);
        return photo;
      });
    setDraft((current) => ({ ...current, photos: [...current.photos, ...additions] }));
    setErrorKey(null);
  }

  function removePhoto(id: string) {
    setDraft((current) => {
      const photo = current.photos.find((candidate) => candidate.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
        objectUrls.current.delete(photo.previewUrl);
      }
      return { ...current, photos: current.photos.filter((candidate) => candidate.id !== id) };
    });
  }

  function makeCoverPhoto(id: string) {
    setDraft((current) => {
      const selected = current.photos.find((photo) => photo.id === id);
      if (!selected || current.photos[0]?.id === id) return current;
      return {
        ...current,
        photos: [selected, ...current.photos.filter((photo) => photo.id !== id)],
      };
    });
  }

  function addItineraryItem() {
    fileSequence.current += 1;
    const item: ItineraryDraft = {
      id: makeId("itinerary", fileSequence.current),
      title: "",
      description: "",
      durationMinutes: "",
      photo: null,
    };
    setDraft((current) => ({ ...current, itinerary: [...current.itinerary, item] }));
    return item.id;
  }

  function removeItineraryItem(id: string) {
    setDraft((current) => {
      const item = current.itinerary.find((candidate) => candidate.id === id);
      if (item?.photo) {
        URL.revokeObjectURL(item.photo.previewUrl);
        objectUrls.current.delete(item.photo.previewUrl);
      }
      return {
        ...current,
        itinerary: current.itinerary.filter((candidate) => candidate.id !== id),
      };
    });
  }

  function updateItineraryItem(
    id: string,
    field: "title" | "description" | "durationMinutes",
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      itinerary: current.itinerary.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
    setErrorKey(null);
  }

  function updateItineraryPhoto(id: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    fileSequence.current += 1;
    const photo = createPhotoDraft(file, makeId("itinerary-photo", fileSequence.current));
    objectUrls.current.add(photo.previewUrl);
    setDraft((current) => ({
      ...current,
      itinerary: current.itinerary.map((item) => {
        if (item.id !== id) return item;
        if (item.photo) {
          URL.revokeObjectURL(item.photo.previewUrl);
          objectUrls.current.delete(item.photo.previewUrl);
        }
        return { ...item, photo };
      }),
    }));
    setErrorKey(null);
  }

  function scrollToTop() {
    contentRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    if (reviewing) {
      setPreviewComplete(true);
      return;
    }

    const validationError = validateActivityCreateStep(currentStep, draft);
    if (validationError) {
      setErrorKey(validationError);
      return;
    }

    if (currentStep === "restrictions") {
      setReviewing(true);
      setErrorKey(null);
      scrollToTop();
      return;
    }

    const nextStep = getNextActivityCreateStep(currentStep);
    setFurthestStepIndex((furthest) => Math.max(furthest, getStepIndex(nextStep)));
    setCurrentStep(nextStep);
    setErrorKey(null);
    scrollToTop();
  }

  function goBack() {
    if (reviewing) {
      setReviewing(false);
      setPreviewComplete(false);
      scrollToTop();
      return;
    }
    if (currentIndex === 0) return;
    setCurrentStep(getPreviousActivityCreateStep(currentStep));
    setErrorKey(null);
    setPreviewComplete(false);
    scrollToTop();
  }

  function navigateToStep(step: ActivityCreateStep) {
    const targetIndex = getStepIndex(step);
    if (!reviewing && targetIndex > currentIndex) {
      const priorStepsAreComplete = ACTIVITY_CREATE_STEPS.slice(0, targetIndex).every(
        (priorStep) => validateActivityCreateStep(priorStep, draft) === null,
      );
      if (targetIndex > furthestStepIndex || !priorStepsAreComplete) return;
    }
    setCurrentStep(step);
    setReviewing(false);
    setPreviewComplete(false);
    setErrorKey(null);
    scrollToTop();
  }

  function getStepTitle(step: ActivityCreateStep) {
    return t(`steps.${step}.title`);
  }

  function renderStep() {
    if (reviewing) return <ReviewStep draft={draft} t={t} />;

    switch (currentStep) {
      case "host":
        return <HostStep draft={draft} onChange={updateField} t={t} />;
      case "name":
        return (
          <NameStep
            value={draft.experienceName}
            onChange={(value) => updateField("experienceName", value)}
            t={t}
          />
        );
      case "description":
        return (
          <DescriptionStep
            experienceName={draft.experienceName}
            value={draft.experienceDescription}
            onChange={(value) => updateField("experienceDescription", value)}
            t={t}
          />
        );
      case "photos":
        return (
          <PhotoStep
            photos={draft.photos}
            onAdd={addPhotoFiles}
            onRemove={removePhoto}
            onCover={makeCoverPhoto}
            t={t}
          />
        );
      case "itinerary":
        return (
          <ItineraryStep
            items={draft.itinerary}
            onAdd={addItineraryItem}
            onRemove={removeItineraryItem}
            onChange={updateItineraryItem}
            onPhotoChange={updateItineraryPhoto}
            t={t}
          />
        );
      case "meeting":
        return <MeetingStep draft={draft} onChange={updateField} t={t} />;
      case "schedule":
        return (
          <ScheduleStep
            schedules={draft.schedules}
            onToggleDate={toggleScheduleDate}
            onSetTimesForDate={setScheduleTimesForDate}
            onApplyTimesToAll={applyScheduleTimesToAll}
            t={t}
          />
        );
      case "capacity":
        return (
          <CapacityStep
            value={draft.maxGuests}
            onChange={(value) => updateField("maxGuests", value)}
            t={t}
          />
        );
      case "price":
        return (
          <PriceStep
            value={draft.pricePerPerson}
            onChange={(value) => updateField("pricePerPerson", value)}
            t={t}
          />
        );
      case "inclusions":
        return (
          <InclusionsStep
            value={draft.inclusions}
            onChange={(value) => updateField("inclusions", value)}
            t={t}
          />
        );
      case "discount":
        return (
          <DiscountStep
            type={draft.discountType}
            percent={draft.discountPercent}
            endsAt={draft.discountEndsAt}
            onTypeChange={updateDiscountType}
            onPercentChange={(value) => updateField("discountPercent", value)}
            onEndsAtChange={(value) => updateField("discountEndsAt", value)}
            t={t}
          />
        );
      case "restrictions":
        return (
          <RestrictionsStep
            value={draft.restrictions}
            hasNoRestrictions={draft.hasNoRestrictions}
            onChange={(value) => updateField("restrictions", value)}
            onNoRestrictionsChange={updateHasNoRestrictions}
            t={t}
          />
        );
    }
  }

  const title = reviewing ? t("review.title") : getStepTitle(currentStep);
  const description = reviewing ? t("review.description") : t(`steps.${currentStep}.description`);
  const isLongStep =
    reviewing ||
    currentStep === "photos" ||
    currentStep === "itinerary" ||
    currentStep === "schedule";
  const currentGroup =
    STEP_GROUPS.find((group) => group.steps.some((step) => step === currentStep)) ?? STEP_GROUPS[0];

  return (
    <div className="fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-[#fff] text-ink">
      <header className="z-20 shrink-0 border-b border-primary/15 bg-[#fff] px-5 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 object-contain"
              priority
            />
            <span className="truncate font-display text-lg font-extrabold tracking-[-0.04em] text-ink">
              HanBuddy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher
              className="min-h-10 px-3 sm:px-4"
              onBeforeLocaleChange={preserveForLocaleChange}
            />
            <Link
              href="/dashboard"
              onClick={clearPreservedDraft}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-white px-3 text-sm font-bold text-ink transition hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4"
            >
              <LogOutIcon className="size-4" />
              {t("actions.exit")}
            </Link>
          </div>
        </div>
      </header>

      <div className="h-1 shrink-0 bg-line-soft lg:hidden">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${(progressIndex / ACTIVITY_CREATE_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <ProgressRail
          currentStep={currentStep}
          furthestStepIndex={furthestStepIndex}
          reviewing={reviewing}
          getTitle={getStepTitle}
          getGroupTitle={(group) => t(`groups.${group}`)}
          isStepComplete={(step) => validateActivityCreateStep(step, draft) === null}
          label={t("progressLabel")}
          onNavigate={navigateToStep}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            ref={contentRef}
            className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <button
              type="button"
              onClick={goBack}
              disabled={!reviewing && currentIndex === 0}
              aria-label={t("actions.back")}
              className="absolute top-5 left-5 z-10 flex size-10 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft disabled:invisible sm:top-8 sm:left-8 lg:top-10 lg:left-10"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
            <div
              className={`mx-auto flex min-h-full w-full flex-col px-5 py-8 sm:px-8 sm:py-12 lg:px-12 ${
                reviewing ? "max-w-7xl" : "max-w-4xl"
              } ${isLongStep ? "justify-start" : "justify-center"}`}
            >
              <div className={`mx-auto w-full ${reviewing ? "max-w-6xl" : "max-w-3xl"}`}>
                <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase lg:hidden">
                  {t(`groups.${currentGroup.key}`)} ·
                  {currentGroup.steps.findIndex((step) => step === currentStep) + 1}/
                  {currentGroup.steps.length}
                </p>
                <h1
                  aria-live="polite"
                  className="mt-2 font-display text-2xl font-bold tracking-tight break-keep text-ink sm:text-3xl"
                >
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                  {description}
                </p>
                <div className="mt-8 sm:mt-10">{renderStep()}</div>
                {errorKey ? (
                  <p
                    role="alert"
                    className="mt-6 rounded-xl border border-primary/20 bg-primary-soft/55 px-4 py-3 text-sm font-semibold text-primary-strong"
                  >
                    {t(`errors.${errorKey}`)}
                  </p>
                ) : null}
                {previewComplete ? (
                  <p
                    role="status"
                    className="mt-6 rounded-xl border border-primary/25 bg-white px-4 py-3 text-sm font-semibold text-primary-strong"
                  >
                    {t("review.complete")}
                  </p>
                ) : null}
              </div>
            </div>
          </main>

          <footer className="z-20 shrink-0 border-t border-primary/15 bg-[#fff] px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-8">
            <div
              className={`mx-auto flex items-center justify-end gap-3 lg:px-12 ${
                reviewing ? "max-w-7xl" : "max-w-4xl"
              }`}
            >
              <button
                type="button"
                onClick={goNext}
                className="flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-[0_8px_18px_rgba(209,63,50,0.18)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-32"
              >
                {reviewing ? t("actions.finish") : t("actions.next")}
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
