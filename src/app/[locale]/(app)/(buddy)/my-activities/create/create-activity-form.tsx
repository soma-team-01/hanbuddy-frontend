"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  ImagePlusIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  ACTIVITY_CREATE_STEPS,
  EMPTY_ACTIVITY_DRAFT,
  getNextActivityCreateStep,
  getPreviousActivityCreateStep,
  getStepIndex,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type ItineraryDraft,
  type PhotoDraft,
  validateActivityCreateStep,
} from "./activity-create-wizard";

const CATEGORY_OPTIONS = ["food", "culture", "sports", "nature", "nightlife", "wellness"] as const;
const MAX_EXPERIENCE_PHOTOS = 10;

const INPUT_CLASS =
  "w-full rounded-xl border border-line-strong bg-white px-4 py-3.5 text-base text-ink outline-none transition focus:border-primary focus:ring-3 focus:ring-primary-soft placeholder:text-muted/60";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-36 resize-y leading-7`;

type DraftTextField = Exclude<keyof ActivityCreateDraft, "photos" | "itinerary">;

function makeId(prefix: string, sequence: number) {
  return `${prefix}-${Date.now()}-${sequence}`;
}

function createPhotoDraft(file: File, id: string): PhotoDraft {
  return { id, file, previewUrl: URL.createObjectURL(file) };
}

function ProgressRail({
  currentStep,
  getTitle,
  label,
}: Readonly<{
  currentStep: ActivityCreateStep;
  getTitle: (step: ActivityCreateStep) => string;
  label: string;
}>) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-line-soft px-8 py-10 xl:block">
      <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
        {currentIndex + 1} / {ACTIVITY_CREATE_STEPS.length}
      </p>
      <ol className="mt-8 space-y-1" aria-label={label}>
        {ACTIVITY_CREATE_STEPS.map((step, index) => {
          const isCurrent = step === currentStep;
          const isComplete = index < currentIndex;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${
                isCurrent ? "bg-primary-soft text-primary-strong" : "text-muted"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                  isComplete || isCurrent
                    ? "border-primary bg-primary text-white"
                    : "border-line-strong bg-white"
                }`}
              >
                {isComplete ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              {getTitle(step)}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function Field({
  label,
  children,
  hint,
}: Readonly<{ label: string; children: ReactNode; hint?: string }>) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      {children}
      {hint ? <span className="leading-5 font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

function CategoryStep({
  value,
  onChange,
  t,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  t: ReturnType<typeof useTranslations<"CreateActivity">>;
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CATEGORY_OPTIONS.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={value === category}
          onClick={() => onChange(category)}
          className={`min-h-24 rounded-2xl border p-5 text-left transition ${
            value === category
              ? "border-primary bg-primary-soft text-primary-strong shadow-[0_8px_24px_rgba(209,63,50,0.1)]"
              : "border-line-strong bg-white text-ink hover:border-primary/60"
          }`}
        >
          <span className="font-display text-lg font-bold">{t(`categories.${category}`)}</span>
        </button>
      ))}
    </div>
  );
}

function PhotoStep({
  photos,
  onAdd,
  onRemove,
  t,
}: Readonly<{
  photos: PhotoDraft[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  t: ReturnType<typeof useTranslations<"CreateActivity">>;
}>) {
  return (
    <div className="space-y-5">
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/45 bg-primary-soft/35 px-6 text-center transition hover:bg-primary-soft/60">
        <ImagePlusIcon className="size-8 text-primary" />
        <span className="mt-3 font-bold text-ink">{t("photos.upload")}</span>
        <span className="mt-1 text-sm text-muted">{t("photos.hint")}</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t("photos.label")}
          onChange={(event) => {
            onAdd(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">
          {t("photos.count", { count: photos.length })}
        </span>
        <span className="text-muted">{t("photos.minimum")}</span>
      </div>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-xl bg-panel"
            >
              <Image
                src={photo.previewUrl}
                alt={t("photos.preview", { index: index + 1 })}
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                aria-label={t("photos.remove", { index: index + 1 })}
                className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:text-primary"
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ItineraryStep({
  items,
  onAdd,
  onRemove,
  onChange,
  onPhotoChange,
  t,
}: Readonly<{
  items: ItineraryDraft[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: "title" | "description" | "durationMinutes", value: string) => void;
  onPhotoChange: (id: string, files: FileList | null) => void;
  t: ReturnType<typeof useTranslations<"CreateActivity">>;
}>) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <section key={item.id} className="rounded-2xl border border-line-soft p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">
              {t("itinerary.item", { index: index + 1 })}
            </h3>
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={t("itinerary.remove", { index: index + 1 })}
                className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-primary-soft hover:text-primary"
              >
                <TrashIcon className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="grid gap-5">
            <Field label={t("fields.itineraryTitle")}>
              <input
                className={INPUT_CLASS}
                value={item.title}
                onChange={(event) => onChange(item.id, "title", event.target.value)}
                placeholder={t("placeholders.itineraryTitle")}
              />
            </Field>
            <Field
              label={t("fields.itineraryDescription")}
              hint={t("itinerary.descriptionCount", { count: item.description.trim().length })}
            >
              <textarea
                className={TEXTAREA_CLASS}
                value={item.description}
                onChange={(event) => onChange(item.id, "description", event.target.value)}
                placeholder={t("placeholders.itineraryDescription")}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("fields.duration")}>
                <div className="relative">
                  <ClockIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
                  <input
                    type="number"
                    min="1"
                    className={`${INPUT_CLASS} pl-12`}
                    value={item.durationMinutes}
                    onChange={(event) => onChange(item.id, "durationMinutes", event.target.value)}
                    placeholder={t("placeholders.duration")}
                  />
                </div>
              </Field>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                {t("fields.itineraryPhoto")}
                <span className="flex min-h-[54px] cursor-pointer items-center gap-3 rounded-xl border border-line-strong px-4 text-muted hover:border-primary">
                  <CameraIcon className="size-5 text-primary" />
                  {item.photo ? item.photo.file.name : t("itinerary.addPhoto")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => onPhotoChange(item.id, event.target.files)}
                  />
                </span>
              </label>
            </div>
          </div>
        </section>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
      >
        <PlusIcon className="size-4" />
        {t("itinerary.add")}
      </button>
    </div>
  );
}

function ReviewStep({
  draft,
  t,
}: Readonly<{
  draft: ActivityCreateDraft;
  t: ReturnType<typeof useTranslations<"CreateActivity">>;
}>) {
  const rows = [
    [t("review.category"), t(`categories.${draft.category as (typeof CATEGORY_OPTIONS)[number]}`)],
    [t("review.concept"), draft.conceptTitle],
    [t("review.host"), draft.hostIntroduction],
    [t("review.photos"), t("photos.count", { count: draft.photos.length })],
    [t("review.name"), draft.experienceName],
    [t("review.meeting"), draft.meetingPlace],
    [t("review.itinerary"), t("review.itineraryCount", { count: draft.itinerary.length })],
    [t("review.guests"), t("review.guestCount", { count: Number(draft.maxGuests) })],
    [t("review.price"), t("review.priceValue", { price: Number(draft.pricePerPerson) })],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/25 bg-primary-soft/45 p-5 text-sm leading-6 text-primary-strong">
        {t("review.apiNotice")}
      </div>
      <dl className="divide-y divide-line-soft border-y border-line-soft">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-5">
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="line-clamp-2 font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CreateActivityForm() {
  const t = useTranslations("CreateActivity");
  const [currentStep, setCurrentStep] = useState<ActivityCreateStep>("category");
  const [draft, setDraft] = useState<ActivityCreateDraft>(EMPTY_ACTIVITY_DRAFT);
  const [errorKey, setErrorKey] = useState<ActivityCreateErrorKey | null>(null);
  const [previewComplete, setPreviewComplete] = useState(false);
  const fileSequence = useRef(0);
  const objectUrls = useRef(new Set<string>());
  const currentIndex = getStepIndex(currentStep);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateField(field: DraftTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
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

  function goNext() {
    const validationError = validateActivityCreateStep(currentStep, draft);
    if (validationError) {
      setErrorKey(validationError);
      return;
    }
    if (currentStep === "review") {
      setPreviewComplete(true);
      return;
    }
    const nextStep = getNextActivityCreateStep(currentStep);
    setCurrentStep(nextStep);
    if (nextStep === "itinerary" && draft.itinerary.length === 0) addItineraryItem();
    setErrorKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (currentIndex === 0) return;
    setCurrentStep(getPreviousActivityCreateStep(currentStep));
    setErrorKey(null);
    setPreviewComplete(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getStepTitle(step: ActivityCreateStep) {
    return t(`steps.${step}.title`);
  }

  function renderStep() {
    switch (currentStep) {
      case "category":
        return (
          <CategoryStep
            value={draft.category}
            onChange={(value) => updateField("category", value)}
            t={t}
          />
        );
      case "concept":
        return (
          <div className="grid gap-6">
            <Field label={t("fields.conceptTitle")} hint={t("hints.conceptTitle")}>
              <input
                className={INPUT_CLASS}
                value={draft.conceptTitle}
                onChange={(event) => updateField("conceptTitle", event.target.value)}
                placeholder={t("placeholders.conceptTitle")}
              />
            </Field>
            <Field label={t("fields.conceptDescription")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.conceptDescription}
                onChange={(event) => updateField("conceptDescription", event.target.value)}
                placeholder={t("placeholders.conceptDescription")}
              />
            </Field>
          </div>
        );
      case "host":
        return (
          <div className="grid gap-6">
            <Field label={t("fields.hostIntroduction")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.hostIntroduction}
                onChange={(event) => updateField("hostIntroduction", event.target.value)}
                placeholder={t("placeholders.hostIntroduction")}
              />
            </Field>
            <Field label={t("fields.qualifications")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.qualifications}
                onChange={(event) => updateField("qualifications", event.target.value)}
                placeholder={t("placeholders.qualifications")}
              />
            </Field>
            <Field label={t("fields.pressHistory")} hint={t("hints.optional")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.pressHistory}
                onChange={(event) => updateField("pressHistory", event.target.value)}
                placeholder={t("placeholders.pressHistory")}
              />
            </Field>
          </div>
        );
      case "photos":
        return (
          <PhotoStep photos={draft.photos} onAdd={addPhotoFiles} onRemove={removePhoto} t={t} />
        );
      case "listing":
        return (
          <div className="grid gap-6">
            <Field label={t("fields.experienceName")} hint={t("hints.experienceName")}>
              <input
                className={INPUT_CLASS}
                value={draft.experienceName}
                onChange={(event) => updateField("experienceName", event.target.value)}
                placeholder={t("placeholders.experienceName")}
              />
            </Field>
            <Field label={t("fields.experienceDescription")}>
              <textarea
                className={`${TEXTAREA_CLASS} min-h-56`}
                value={draft.experienceDescription}
                onChange={(event) => updateField("experienceDescription", event.target.value)}
                placeholder={t("placeholders.experienceDescription")}
              />
            </Field>
          </div>
        );
      case "meeting":
        return (
          <div className="grid gap-6">
            <Field label={t("fields.meetingPlace")}>
              <div className="relative">
                <MapPinIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary" />
                <input
                  className={`${INPUT_CLASS} pl-12`}
                  value={draft.meetingPlace}
                  onChange={(event) => updateField("meetingPlace", event.target.value)}
                  placeholder={t("placeholders.meetingPlace")}
                />
              </div>
            </Field>
            <Field label={t("fields.meetingDetails")} hint={t("hints.meetingDetails")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.meetingDetails}
                onChange={(event) => updateField("meetingDetails", event.target.value)}
                placeholder={t("placeholders.meetingDetails")}
              />
            </Field>
          </div>
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
      case "pricing":
        return (
          <div className="grid gap-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("fields.maxGuests")}>
                <div className="relative">
                  <UsersIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
                  <input
                    type="number"
                    min="1"
                    className={`${INPUT_CLASS} pl-12`}
                    value={draft.maxGuests}
                    onChange={(event) => updateField("maxGuests", event.target.value)}
                    placeholder={t("placeholders.maxGuests")}
                  />
                </div>
              </Field>
              <Field label={t("fields.pricePerPerson")}>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-muted">
                    ₩
                  </span>
                  <input
                    type="number"
                    min="1"
                    className={`${INPUT_CLASS} pl-10`}
                    value={draft.pricePerPerson}
                    onChange={(event) => updateField("pricePerPerson", event.target.value)}
                    placeholder={t("placeholders.pricePerPerson")}
                  />
                </div>
              </Field>
            </div>
            <Field label={t("fields.inclusions")} hint={t("hints.onePerLine")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.inclusions}
                onChange={(event) => updateField("inclusions", event.target.value)}
                placeholder={t("placeholders.inclusions")}
              />
            </Field>
            <Field label={t("fields.discount")} hint={t("hints.optional")}>
              <input
                type="number"
                min="0"
                max="100"
                className={INPUT_CLASS}
                value={draft.discountPercent}
                onChange={(event) => updateField("discountPercent", event.target.value)}
                placeholder={t("placeholders.discount")}
              />
            </Field>
            <Field label={t("fields.restrictions")} hint={t("hints.onePerLine")}>
              <textarea
                className={TEXTAREA_CLASS}
                value={draft.restrictions}
                onChange={(event) => updateField("restrictions", event.target.value)}
                placeholder={t("placeholders.restrictions")}
              />
            </Field>
          </div>
        );
      case "review":
        return <ReviewStep draft={draft} t={t} />;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col bg-white">
      <header className="border-b border-line-soft px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1 truncate font-display text-lg font-bold text-ink sm:text-xl">
              {t("title")}
            </h1>
          </div>
          <p className="shrink-0 text-sm font-semibold text-muted">
            {t("progress", { current: currentIndex + 1, total: ACTIVITY_CREATE_STEPS.length })}
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 overflow-hidden border-x border-line-soft">
        <ProgressRail
          currentStep={currentStep}
          getTitle={getStepTitle}
          label={t("progressLabel")}
        />
        <main className="min-w-0 flex-1">
          <div className="h-1 bg-line-soft xl:hidden">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${((currentIndex + 1) / ACTIVITY_CREATE_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase xl:hidden">
              {t("progress", { current: currentIndex + 1, total: ACTIVITY_CREATE_STEPS.length })}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {getStepTitle(currentStep)}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {t(`steps.${currentStep}.description`)}
            </p>
            <div className="mt-9">{renderStep()}</div>
            {errorKey ? (
              <p
                role="alert"
                className="mt-6 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-strong"
              >
                {t(`errors.${errorKey}`)}
              </p>
            ) : null}
            {previewComplete ? (
              <p
                role="status"
                className="mt-6 rounded-xl bg-panel px-4 py-3 text-sm font-semibold text-ink"
              >
                {t("review.complete")}
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <footer className="sticky bottom-0 z-20 border-t border-line-soft bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 xl:pl-72">
          <button
            type="button"
            onClick={goBack}
            disabled={currentIndex === 0}
            className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-ink hover:bg-panel disabled:invisible"
          >
            <ArrowLeftIcon className="size-4" />
            {t("actions.back")}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-[0_10px_22px_rgba(209,63,50,0.2)] hover:bg-primary-hover sm:min-w-40"
          >
            {currentStep === "review" ? t("actions.finish") : t("actions.next")}
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
