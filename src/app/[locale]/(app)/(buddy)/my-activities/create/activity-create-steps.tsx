"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  CompassIcon,
  ImagePlusIcon,
  MapPinIcon,
  MartiniIcon,
  MinusIcon,
  PencilIcon,
  PlaneIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrashIcon,
  UserMinusIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
} from "@/components/ui/icons";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { useMyProfile } from "@/lib/api/useMyProfile";
import type { Locale } from "@/i18n/routing";
import { getSeoulNowParts } from "@/lib/datetime";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetailsViaBff,
  getGoogleMapsApiKey,
  searchGooglePlacePredictionsViaBff,
  type GooglePlacePrediction,
} from "@/lib/google/places";
import {
  ACTIVITY_CREATE_LIMITS,
  buildPreviewActivityFromDraft,
  type ActivityCreateDraft,
  type DiscountType,
  type ItineraryDraft,
  type PhotoDraft,
  type ScheduleDraft,
} from "./activity-create-wizard";

type Translator = ReturnType<typeof useTranslations<"CreateActivity">>;

const INCLUSION_OPTIONS = [
  { key: "tickets", Icon: CompassIcon },
  { key: "meal", Icon: UtensilsIcon },
  { key: "snacks", Icon: ShoppingBagIcon },
  { key: "drinks", Icon: MartiniIcon },
  { key: "transport", Icon: PlaneIcon },
  { key: "parking", Icon: MapPinIcon },
  { key: "equipment", Icon: CompassIcon },
  { key: "souvenir", Icon: SparklesIcon },
] as const;

const RESTRICTION_OPTIONS = [
  { key: "age", Icon: UsersIcon },
  { key: "activity", Icon: CompassIcon },
  { key: "accessibility", Icon: UserMinusIcon },
  { key: "allergy", Icon: UtensilsIcon },
] as const;

export const INPUT_CLASS =
  "w-full rounded-xl border border-line-strong bg-white px-4 py-3.5 text-base text-ink outline-none transition placeholder:text-muted/55 focus:border-primary focus:ring-3 focus:ring-primary-soft focus-visible:!outline-none";
export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-36 resize-y leading-7`;

export function Field({
  label,
  children,
  hint,
}: Readonly<{ label: string; children: ReactNode; hint?: string }>) {
  return (
    <div className="grid gap-2.5 text-sm text-ink">
      <label className="grid gap-2.5 font-semibold">
        <span>{label}</span>
        {children}
      </label>
      {hint ? <span className="text-sm leading-5 font-normal text-muted">{hint}</span> : null}
    </div>
  );
}

export function HostStep({
  draft,
  onChange,
  t,
}: Readonly<{
  draft: ActivityCreateDraft;
  onChange: (field: "hostIntroduction", value: string) => void;
  t: Translator;
}>) {
  return (
    <div className="mx-auto w-full max-w-2xl py-4 text-center sm:py-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <UsersIcon className="size-6" />
      </div>
      <label className="sr-only" htmlFor="host-introduction">
        {t("fields.hostIntroduction")}
      </label>
      <textarea
        id="host-introduction"
        autoFocus
        rows={1}
        maxLength={ACTIVITY_CREATE_LIMITS.hostIntroduction.max}
        className="mt-7 [field-sizing:content] max-h-80 min-h-0 w-full resize-none overflow-y-auto border-0 border-b-2 border-line-strong bg-transparent px-3 py-2 text-center text-lg leading-8 font-semibold text-ink transition outline-none placeholder:text-muted/35 focus:border-primary focus-visible:!outline-none sm:text-xl"
        value={draft.hostIntroduction}
        onChange={(event) => onChange("hostIntroduction", event.target.value)}
        placeholder={t("placeholders.hostIntroduction")}
      />
      <p className="mt-4 text-sm text-muted tabular-nums">
        {t("hints.hostIntroductionCharacters", {
          count: draft.hostIntroduction.trim().length,
          min: ACTIVITY_CREATE_LIMITS.hostIntroduction.min,
          max: ACTIVITY_CREATE_LIMITS.hostIntroduction.max,
        })}
      </p>
    </div>
  );
}

export function NameStep({
  value,
  onChange,
  t,
}: Readonly<{ value: string; onChange: (value: string) => void; t: Translator }>) {
  return (
    <div className="mx-auto w-full max-w-2xl py-4 text-center sm:py-10">
      <label className="sr-only" htmlFor="experience-name">
        {t("fields.experienceName")}
      </label>
      <input
        id="experience-name"
        autoFocus
        maxLength={ACTIVITY_CREATE_LIMITS.experienceName.max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("placeholders.experienceName")}
        className="w-full border-b-2 border-line-strong bg-transparent px-2 py-2 text-center font-display text-2xl font-bold tracking-tight text-ink transition outline-none placeholder:text-muted/35 focus:border-primary focus-visible:!outline-none sm:text-4xl"
      />
      <p className="mt-4 text-sm text-muted tabular-nums">
        {t("hints.experienceNameCharacters", {
          count: value.trim().length,
          max: ACTIVITY_CREATE_LIMITS.experienceName.max,
        })}
      </p>
    </div>
  );
}

export function DescriptionStep({
  experienceName,
  value,
  onChange,
  t,
}: Readonly<{
  experienceName: string;
  value: string;
  onChange: (value: string) => void;
  t: Translator;
}>) {
  return (
    <div className="mx-auto w-full max-w-2xl py-3 text-center sm:py-8">
      <p className="font-display text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl">
        {experienceName}
      </p>
      <label className="sr-only" htmlFor="experience-description">
        {t("fields.experienceDescription")}
      </label>
      <textarea
        id="experience-description"
        autoFocus
        rows={1}
        maxLength={ACTIVITY_CREATE_LIMITS.experienceDescription.max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("placeholders.experienceDescription")}
        className="mt-7 [field-sizing:content] max-h-64 min-h-0 w-full resize-none overflow-y-auto border-0 border-b-2 border-line-strong bg-transparent px-3 py-2 text-center text-base leading-7 font-medium text-ink transition outline-none placeholder:text-muted/45 focus:border-primary focus-visible:!outline-none sm:text-lg"
      />
      <p className="mt-4 text-center text-sm text-muted tabular-nums">
        {t("hints.experienceDescriptionCharacters", {
          count: value.trim().length,
          min: ACTIVITY_CREATE_LIMITS.experienceDescription.min,
          max: ACTIVITY_CREATE_LIMITS.experienceDescription.max,
        })}
      </p>
    </div>
  );
}

export function PhotoStep({
  photos,
  onAdd,
  onRemove,
  onCover,
  t,
}: Readonly<{
  photos: PhotoDraft[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onCover: (id: string) => void;
  t: Translator;
}>) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-semibold text-ink">
          {t("photos.count", { count: photos.length })}
        </span>
        {photos.length < ACTIVITY_CREATE_LIMITS.photos.min ? (
          <span className="text-muted">{t("photos.minimum")}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-white transition ${
              index === 0
                ? "border-primary shadow-[0_8px_24px_rgba(209,63,50,0.12)]"
                : "border-transparent"
            }`}
          >
            <Image
              src={photo.previewUrl}
              alt={t("photos.preview", { index: index + 1 })}
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              unoptimized
              className="object-cover"
            />
            {index === 0 ? (
              <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink">
                {t("photos.cover")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onCover(photo.id)}
                className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition hover:text-primary sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              >
                {t("photos.makeCover")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              aria-label={t("photos.remove", { index: index + 1 })}
              className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < 10 ? (
          <label className="flex aspect-square min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/55 bg-white px-4 text-center transition hover:border-primary hover:bg-primary-soft/30">
            <ImagePlusIcon className="size-7 text-primary" />
            <span className="mt-3 text-sm font-bold text-ink">{t("photos.upload")}</span>
            <span className="mt-1 text-xs text-muted">{t("photos.hint")}</span>
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
        ) : null}
      </div>
    </div>
  );
}

export function ItineraryStep({
  items,
  onAdd,
  onRemove,
  onChange,
  onPhotoChange,
  t,
}: Readonly<{
  items: ItineraryDraft[];
  onAdd: () => string;
  onRemove: (id: string) => void;
  onChange: (id: string, field: "title" | "description" | "durationMinutes", value: string) => void;
  onPhotoChange: (id: string, files: FileList | null) => void;
  t: Translator;
}>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorStep, setEditorStep] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingId) ?? null;
  const editorSteps = ["photo", "title", "description", "duration"] as const;

  useEffect(() => {
    if (!editingId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingId(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [editingId]);

  function openEditor(id: string, step = 0) {
    setEditingId(id);
    setEditorStep(step);
    setEditorError(null);
  }

  function addItem() {
    openEditor(onAdd());
  }

  function goEditorNext() {
    if (!editingItem) return;
    if (editorStep === 0 && !editingItem.photo) {
      setEditorError(t("itinerary.editor.errors.photo"));
      return;
    }
    if (
      editorStep === 1 &&
      (editingItem.title.trim().length < ACTIVITY_CREATE_LIMITS.itineraryTitle.min ||
        editingItem.title.trim().length > ACTIVITY_CREATE_LIMITS.itineraryTitle.max)
    ) {
      setEditorError(t("itinerary.editor.errors.title"));
      return;
    }
    if (
      editorStep === 2 &&
      (editingItem.description.trim().length < ACTIVITY_CREATE_LIMITS.itineraryDescription.min ||
        editingItem.description.trim().length > ACTIVITY_CREATE_LIMITS.itineraryDescription.max)
    ) {
      setEditorError(t("itinerary.editor.errors.description"));
      return;
    }
    if (editorStep === 3 && Number(editingItem.durationMinutes) < 1) {
      setEditorError(t("itinerary.editor.errors.duration"));
      return;
    }
    if (editorStep === editorSteps.length - 1) {
      setEditingId(null);
      return;
    }
    setEditorStep((current) => current + 1);
    setEditorError(null);
  }

  return (
    <div className="w-full space-y-4">
      {items.map((item, index) => {
        const complete =
          item.photo &&
          item.title.trim().length >= ACTIVITY_CREATE_LIMITS.itineraryTitle.min &&
          item.title.trim().length <= ACTIVITY_CREATE_LIMITS.itineraryTitle.max &&
          item.description.trim().length >= ACTIVITY_CREATE_LIMITS.itineraryDescription.min &&
          item.description.trim().length <= ACTIVITY_CREATE_LIMITS.itineraryDescription.max &&
          Number(item.durationMinutes) > 0;
        return (
          <section
            key={item.id}
            className="group flex items-center gap-4 rounded-2xl border border-line-soft bg-white p-3 shadow-[0_8px_30px_rgba(38,27,24,0.05)] transition hover:border-primary/45"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white">
              {item.photo ? (
                <Image
                  src={item.photo.previewUrl}
                  alt=""
                  fill
                  sizes="80px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <CameraIcon className="absolute top-1/2 left-1/2 size-6 -translate-1/2 text-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => openEditor(item.id)}
              className="min-w-0 flex-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="block text-xs font-bold tracking-[0.12em] text-primary uppercase">
                {t("itinerary.item", { index: index + 1 })}
              </span>
              <span className="mt-1 flex min-w-0 items-baseline gap-2">
                <span className="truncate font-display text-base font-bold text-ink">
                  {item.title || t("itinerary.untitled")}
                </span>
                {item.durationMinutes ? (
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {t("itinerary.durationSummary", { minutes: Number(item.durationMinutes) })}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm text-muted">
                {item.description || t("itinerary.incomplete")}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {complete ? <CheckIcon className="size-5 text-primary" /> : null}
              <button
                type="button"
                onClick={() => openEditor(item.id)}
                aria-label={t("itinerary.edit", { index: index + 1 })}
                className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              >
                <ChevronRightIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={t("itinerary.remove", { index: index + 1 })}
                className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          </section>
        );
      })}
      <button
        type="button"
        onClick={addItem}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/55 bg-white px-5 text-sm font-bold text-primary-strong transition hover:border-primary hover:bg-primary-soft/30"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
          <PlusIcon className="size-4" />
        </span>
        {t("itinerary.add")}
      </button>

      {editingItem ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="itinerary-editor-title"
        >
          <div className="flex max-h-[94dvh] min-h-[72dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:min-h-[640px] sm:rounded-3xl">
            <div className="flex items-center justify-between px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() =>
                  editorStep > 0 ? setEditorStep((current) => current - 1) : setEditingId(null)
                }
                aria-label={t("actions.back")}
                className="flex size-10 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft"
              >
                <ArrowLeftIcon className="size-5" />
              </button>
              <p className="text-sm font-bold text-muted">
                {t("itinerary.editor.progress", {
                  current: editorStep + 1,
                  total: editorSteps.length,
                })}
              </p>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                aria-label={t("itinerary.editor.close")}
                className="flex size-10 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-5 sm:px-7" aria-hidden>
              {editorSteps.map((step, index) => (
                <span
                  key={step}
                  className={`h-1 rounded-full ${index <= editorStep ? "bg-primary" : "bg-line-soft"}`}
                />
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-10">
              {editorStep === 0 ? (
                <div className="mx-auto max-w-xl text-center">
                  <h2
                    id="itinerary-editor-title"
                    className="font-display text-xl font-bold sm:text-2xl"
                  >
                    {t("itinerary.editor.photoTitle")}
                  </h2>
                  <p className="mt-2 text-muted">{t("itinerary.editor.photoDescription")}</p>
                  <label className="relative mt-8 flex aspect-[16/9] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/55 bg-white transition hover:border-primary hover:bg-primary-soft/20">
                    {editingItem.photo ? (
                      <>
                        <Image
                          src={editingItem.photo.previewUrl}
                          alt=""
                          fill
                          sizes="600px"
                          unoptimized
                          className="object-cover"
                        />
                        <span className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm">
                          <PencilIcon className="size-3.5" />
                          {t("itinerary.editor.changePhoto")}
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-col items-center text-ink">
                        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <CameraIcon className="size-6" />
                        </span>
                        <span className="mt-3 font-bold">{t("itinerary.addPhoto")}</span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      aria-label={t("itinerary.photoLabel", { index: 1 })}
                      onChange={(event) => {
                        onPhotoChange(editingItem.id, event.target.files);
                        setEditorError(null);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : null}
              {editorStep === 2 ? (
                <div className="mx-auto max-w-xl text-center">
                  <h2
                    id="itinerary-editor-title"
                    className="font-display text-xl font-bold sm:text-2xl"
                  >
                    {t("itinerary.editor.descriptionTitle")}
                  </h2>
                  <textarea
                    autoFocus
                    rows={1}
                    maxLength={ACTIVITY_CREATE_LIMITS.itineraryDescription.max}
                    aria-label={t("fields.itineraryDescription")}
                    className="mt-10 [field-sizing:content] max-h-56 min-h-0 w-full resize-none overflow-y-auto border-0 border-b-2 border-line-strong bg-transparent px-3 py-2 text-center text-lg leading-7 font-semibold outline-none placeholder:text-muted/35 focus:border-primary focus-visible:!outline-none"
                    value={editingItem.description}
                    onChange={(event) => {
                      onChange(editingItem.id, "description", event.target.value);
                      setEditorError(null);
                    }}
                    placeholder={t("placeholders.itineraryDescription")}
                  />
                  <p className="mt-4 text-sm text-muted">
                    {t("itinerary.descriptionCount", {
                      count: editingItem.description.trim().length,
                      min: ACTIVITY_CREATE_LIMITS.itineraryDescription.min,
                      max: ACTIVITY_CREATE_LIMITS.itineraryDescription.max,
                    })}
                  </p>
                </div>
              ) : null}
              {editorStep === 3 ? (
                <div className="mx-auto max-w-md text-center">
                  <h2
                    id="itinerary-editor-title"
                    className="font-display text-xl font-bold sm:text-2xl"
                  >
                    {t("itinerary.editor.durationTitle")}
                  </h2>
                  <div className="mt-16 flex items-center justify-center gap-8">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          editingItem.id,
                          "durationMinutes",
                          String(Math.max(5, (Number(editingItem.durationMinutes) || 5) - 5)),
                        )
                      }
                      className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-white text-primary transition hover:border-primary hover:bg-primary-soft"
                      aria-label={t("itinerary.editor.decreaseDuration")}
                    >
                      <MinusIcon className="size-5" />
                    </button>
                    <div>
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        value={editingItem.durationMinutes}
                        onChange={(event) => {
                          onChange(editingItem.id, "durationMinutes", event.target.value);
                          setEditorError(null);
                        }}
                        aria-label={t("fields.duration")}
                        className="w-32 bg-transparent text-center font-display text-5xl font-extrabold outline-none focus-visible:!outline-none sm:text-6xl"
                        placeholder="60"
                      />
                      <p className="mt-2 font-semibold text-muted">
                        {t("itinerary.editor.minutes")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          editingItem.id,
                          "durationMinutes",
                          String((Number(editingItem.durationMinutes) || 0) + 5),
                        )
                      }
                      className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-white text-primary transition hover:border-primary hover:bg-primary-soft"
                      aria-label={t("itinerary.editor.increaseDuration")}
                    >
                      <PlusIcon className="size-5" />
                    </button>
                  </div>
                </div>
              ) : null}
              {editorStep === 1 ? (
                <div className="mx-auto max-w-xl text-center">
                  <h2
                    id="itinerary-editor-title"
                    className="font-display text-xl font-bold sm:text-2xl"
                  >
                    {t("itinerary.editor.titleTitle")}
                  </h2>
                  <input
                    autoFocus
                    maxLength={ACTIVITY_CREATE_LIMITS.itineraryTitle.max}
                    value={editingItem.title}
                    onChange={(event) => {
                      onChange(editingItem.id, "title", event.target.value);
                      setEditorError(null);
                    }}
                    placeholder={t("placeholders.itineraryTitle")}
                    aria-label={t("fields.itineraryTitle")}
                    className="mt-16 w-full border-0 border-b-2 border-line-strong bg-transparent px-3 py-2 text-center font-display text-2xl font-bold outline-none placeholder:text-muted/35 focus:border-primary focus-visible:!outline-none"
                  />
                  <p className="mt-4 text-sm text-muted tabular-nums">
                    {t("itinerary.titleCount", {
                      count: editingItem.title.trim().length,
                      max: ACTIVITY_CREATE_LIMITS.itineraryTitle.max,
                    })}
                  </p>
                </div>
              ) : null}
              {editorError ? (
                <p
                  role="alert"
                  className="mx-auto mt-6 max-w-xl text-center text-sm font-bold text-primary-strong"
                >
                  {editorError}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end border-t border-line-soft px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={goEditorNext}
                className="flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-hover"
              >
                {editorStep === editorSteps.length - 1
                  ? t("itinerary.editor.done")
                  : t("actions.next")}
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MeetingStep({
  draft,
  onChange,
  t,
}: Readonly<{
  draft: ActivityCreateDraft;
  onChange: (field: "meetingAddress" | "meetingPlaceId" | "meetingPlace", value: string) => void;
  t: Translator;
}>) {
  const locale = useLocale() as Locale;
  const apiKey = getGoogleMapsApiKey();
  const [query, setQuery] = useState(draft.meetingAddress);
  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "selecting" | "error">("idle");
  const mapUrl = buildGoogleMapsEmbedUrl(draft.meetingPlaceId, apiKey, locale);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!apiKey || trimmedQuery.length < 2 || draft.meetingPlaceId) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const results = await searchGooglePlacePredictionsViaBff(trimmedQuery, locale);
        if (!active) return;
        setPredictions(results);
        setStatus("idle");
      } catch {
        if (!active) return;
        setPredictions([]);
        setStatus("error");
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [apiKey, draft.meetingPlaceId, locale, query]);

  function updateQuery(value: string) {
    setQuery(value);
    setPredictions([]);
    setStatus("idle");
    if (draft.meetingPlaceId || draft.meetingAddress) {
      onChange("meetingPlaceId", "");
      onChange("meetingAddress", "");
    }
  }

  async function selectPrediction(prediction: GooglePlacePrediction) {
    setStatus("selecting");
    try {
      const details = await fetchGooglePlaceDetailsViaBff(prediction.placeId, locale);
      const address = details.formattedAddress || prediction.text;
      setQuery(address);
      setPredictions([]);
      onChange("meetingPlaceId", prediction.placeId);
      onChange("meetingAddress", address);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid w-full gap-7">
      <Field label={t("fields.meetingPlace")} hint={t("hints.meetingPlace")}>
        <input
          className={INPUT_CLASS}
          value={draft.meetingPlace}
          onChange={(event) => onChange("meetingPlace", event.target.value)}
          placeholder={t("placeholders.meetingPlace")}
        />
      </Field>
      <div className="grid gap-2.5 text-sm text-ink">
        <label htmlFor="meeting-address" className="font-semibold">
          {t("fields.meetingAddress")}
        </label>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary" />
          <input
            id="meeting-address"
            role="combobox"
            aria-expanded={predictions.length > 0}
            aria-controls="meeting-address-results"
            aria-autocomplete="list"
            className={`${INPUT_CLASS} pl-12`}
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder={t("placeholders.meetingAddress")}
          />
        </div>
        <span className="text-sm leading-5 font-normal text-muted">
          {t("hints.meetingAddress")}
        </span>
        {predictions.length ? (
          <ul
            id="meeting-address-results"
            role="listbox"
            className="overflow-hidden rounded-2xl border border-line-soft bg-white shadow-[0_14px_40px_rgba(38,27,24,0.1)]"
          >
            {predictions.map((prediction) => (
              <li key={prediction.placeId} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => void selectPrediction(prediction)}
                  className="flex w-full items-start gap-3 border-b border-line-soft px-4 py-3.5 text-left transition last:border-b-0 hover:bg-primary-soft/35"
                >
                  <MapPinIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{prediction.mainText}</span>
                    {prediction.secondaryText ? (
                      <span className="mt-0.5 block text-sm text-muted">
                        {prediction.secondaryText}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <span aria-live="polite" className="text-sm font-medium text-muted">
          {!apiKey
            ? t("meeting.apiUnavailable")
            : status === "searching"
              ? t("meeting.searching")
              : status === "selecting"
                ? t("meeting.selecting")
                : status === "error"
                  ? t("meeting.searchError")
                  : ""}
        </span>
        {draft.meetingAddress && draft.meetingPlaceId ? (
          <div className="overflow-hidden rounded-2xl border border-line-soft bg-white">
            <div className="flex items-start gap-3 px-4 py-3.5 font-normal">
              <MapPinIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="leading-6 text-ink">{draft.meetingAddress}</span>
            </div>
            {mapUrl ? (
              <iframe
                title={t("meeting.mapTitle")}
                src={mapUrl}
                className="h-64 w-full border-0 sm:h-72"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CapacityStep({
  value,
  onChange,
  t,
}: Readonly<{ value: string; onChange: (value: string) => void; t: Translator }>) {
  const guests = Number(value) || 1;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center sm:py-14">
      <UsersIcon className="size-9 text-primary" />
      <div className="mt-8 flex w-full items-center justify-between gap-8">
        <button
          type="button"
          disabled={guests <= 1}
          onClick={() => onChange(String(Math.max(1, guests - 1)))}
          aria-label={t("capacity.decrease")}
          className="flex size-12 items-center justify-center rounded-full border border-line-strong text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <MinusIcon className="size-5" />
        </button>
        <div>
          <span className="font-display text-5xl font-extrabold tracking-tight text-ink tabular-nums sm:text-6xl">
            {guests}
          </span>
          <p className="mt-2 text-sm font-semibold text-muted">
            {t("capacity.guests", { count: guests })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(String(guests + 1))}
          aria-label={t("capacity.increase")}
          className="flex size-12 items-center justify-center rounded-full border border-line-strong text-ink transition hover:border-primary hover:text-primary"
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const calendarStart = new Date(Date.UTC(year, month, 1 - firstDay.getUTCDay()));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setUTCDate(calendarStart.getUTCDate() + index);
    return date;
  });
}

function formatScheduleDate(dateKey: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    parseDateKey(dateKey),
  );
}

function formatScheduleTime(time: string, locale: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, hours, minutes)));
}

export function ScheduleStep({
  schedules,
  onToggleDate,
  onSetTimesForDate,
  onApplyTimesToAll,
  t,
}: Readonly<{
  schedules: ScheduleDraft[];
  onToggleDate: (date: string) => void;
  onSetTimesForDate: (date: string, startTimes: string[]) => void;
  onApplyTimesToAll: (sourceDate: string) => void;
  t: Translator;
}>) {
  const locale = useLocale();
  const today = getSeoulNowParts();
  // 일정이 없으면 UTC가 아니라 Asia/Seoul 기준 오늘이 속한 달을 연다 (월말 KST 오전에 이전 달이 열리는 문제 방지)
  const initialMonth = parseDateKey(schedules[0]?.date ?? today.date);
  const [visibleMonth, setVisibleMonth] = useState({
    year: initialMonth.getUTCFullYear(),
    month: initialMonth.getUTCMonth(),
  });
  const selectedDateList = [...new Set(schedules.map((schedule) => schedule.date))].sort((a, b) =>
    a.localeCompare(b),
  );
  const [focusedDate, setFocusedDate] = useState<string | null>(selectedDateList[0] ?? null);
  const [customTime, setCustomTime] = useState("");
  const selectedDates = new Set(selectedDateList);
  const activeDate =
    focusedDate && selectedDates.has(focusedDate) ? focusedDate : (selectedDateList[0] ?? null);
  const activeTimes = schedules
    .filter((schedule) => schedule.date === activeDate && schedule.startTime)
    .map((schedule) => schedule.startTime)
    .sort((a, b) => a.localeCompare(b));
  // 오늘 날짜에는 Asia/Seoul 기준으로 이미 지난 시각을 추가할 수 없다
  const isPastCustomTime =
    activeDate === today.date && Boolean(customTime) && customTime <= today.time;
  const sessionCount = schedules.filter((schedule) => schedule.startTime).length;
  const calendarDays = getCalendarDays(visibleMonth.year, visibleMonth.month);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)));
  const weekdayLabels = Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 7 + day)),
    ),
  );

  function moveMonth(offset: number) {
    const nextMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + offset, 1));
    setVisibleMonth({ year: nextMonth.getUTCFullYear(), month: nextMonth.getUTCMonth() });
  }

  function selectCalendarDate(dateKey: string, selected: boolean) {
    if (!selected) onToggleDate(dateKey);
    setFocusedDate(dateKey);
    setCustomTime("");
  }

  function addCustomTime() {
    if (!activeDate || !customTime || isPastCustomTime || activeTimes.includes(customTime)) return;
    onSetTimesForDate(activeDate, [...activeTimes, customTime]);
    setCustomTime("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section
          aria-label={t("schedule.calendarLabel")}
          className="rounded-2xl border border-line-soft bg-white p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label={t("schedule.previousMonth")}
              className="flex size-10 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <h2 className="font-display text-lg font-bold text-ink">{monthLabel}</h2>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label={t("schedule.nextMonth")}
              className="flex size-10 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft"
            >
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 text-center">
            {weekdayLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="py-2 text-xs font-bold text-muted">
                {label}
              </span>
            ))}
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const selected = selectedDates.has(dateKey);
              const hasStartTime = schedules.some(
                (schedule) => schedule.date === dateKey && schedule.startTime,
              );
              const isVisibleMonth = date.getUTCMonth() === visibleMonth.month;
              const isPast = dateKey < today.date;
              const fullDate = formatScheduleDate(dateKey, locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={isPast}
                  aria-pressed={selected}
                  aria-label={
                    selected
                      ? t("schedule.editDate", { date: fullDate })
                      : t("schedule.selectDate", { date: fullDate })
                  }
                  onClick={() => {
                    selectCalendarDate(dateKey, selected);
                    if (!isVisibleMonth) {
                      setVisibleMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
                    }
                  }}
                  className="group flex aspect-square items-center justify-center p-0.5 disabled:cursor-not-allowed"
                >
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-full text-sm font-semibold transition sm:size-10 ${
                      selected && activeDate === dateKey
                        ? "bg-primary text-white shadow-[0_6px_14px_rgba(209,63,50,0.2)] ring-2 ring-primary/20 ring-offset-2"
                        : selected
                          ? "border border-primary bg-white text-primary-strong"
                          : isPast
                            ? "text-muted/25"
                            : isVisibleMonth
                              ? "text-ink group-hover:bg-primary-soft group-hover:text-primary-strong"
                              : "text-muted/35 group-hover:bg-primary-soft/35"
                    }`}
                  >
                    {date.getUTCDate()}
                    {hasStartTime ? (
                      <span
                        aria-hidden
                        data-testid={`schedule-status-${dateKey}`}
                        className={`absolute bottom-1 size-1 rounded-full ${
                          activeDate === dateKey ? "bg-white" : "bg-primary"
                        }`}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col rounded-2xl border border-primary/35 bg-white p-5 shadow-[0_12px_30px_rgba(209,63,50,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                {t("schedule.selectedTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {t("schedule.selectedCount", { count: selectedDateList.length })} ·{" "}
                {t("schedule.sessionCount", { count: sessionCount })}
              </p>
            </div>
            <CalendarDaysIcon className="size-5 text-primary" />
          </div>

          {activeDate ? (
            <div className="mt-5 min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-4">
                <div>
                  <p className="text-xs font-semibold text-primary-strong">
                    {t("schedule.editingDate")}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-ink">
                    {formatScheduleDate(activeDate, locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleDate(activeDate)}
                  aria-label={t("schedule.removeDate", {
                    date: formatScheduleDate(activeDate, locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  })}
                  className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="space-y-4 py-5">
                <div>
                  <label htmlFor="custom-schedule-time" className="text-xs font-bold text-ink">
                    {t("schedule.customTime")}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="custom-schedule-time"
                      type="time"
                      value={customTime}
                      onChange={(event) => setCustomTime(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomTime();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addCustomTime}
                      disabled={!customTime || isPastCustomTime || activeTimes.includes(customTime)}
                      className="rounded-xl border border-primary bg-white px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted/35"
                    >
                      {t("schedule.addTime")}
                    </button>
                  </div>
                  {isPastCustomTime ? (
                    <p className="mt-2 text-xs font-semibold text-primary-strong">
                      {t("schedule.pastTimeHint")}
                    </p>
                  ) : null}
                </div>

                {activeTimes.length ? (
                  <div className="flex flex-wrap gap-2" aria-label={t("schedule.addedTimes")}>
                    {activeTimes.map((time) => {
                      const timeLabel = formatScheduleTime(time, locale);
                      return (
                        <div
                          key={time}
                          data-testid={`schedule-time-${activeDate}-${time}`}
                          className="flex min-h-10 items-center gap-2 rounded-xl border border-primary bg-primary py-2 pr-2 pl-3 text-sm font-bold text-white shadow-[0_5px_14px_rgba(209,63,50,0.16)]"
                        >
                          <span>{timeLabel}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onSetTimesForDate(
                                activeDate,
                                activeTimes.filter((selectedTime) => selectedTime !== time),
                              )
                            }
                            aria-label={t("schedule.removeTime", {
                              date: formatScheduleDate(activeDate, locale, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }),
                              time: timeLabel,
                            })}
                            className="flex size-6 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-xs leading-5 text-muted">
                    {t("schedule.noTimes")}
                  </p>
                )}
              </div>

              {selectedDateList.length > 1 ? (
                <button
                  type="button"
                  disabled={!activeTimes.length}
                  onClick={() => onApplyTimesToAll(activeDate)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 py-3 text-sm font-bold text-primary-strong transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted/35"
                >
                  <CheckIcon className="size-4" />
                  {t("schedule.applyDateTimesToAll", { count: selectedDateList.length })}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm leading-6 text-muted">
              {t("schedule.empty")}
            </p>
          )}
        </aside>
      </div>
      <p className="text-sm leading-6 text-muted">{t("schedule.notice")}</p>
    </div>
  );
}

export function PriceStep({
  value,
  onChange,
  t,
}: Readonly<{ value: string; onChange: (value: string) => void; t: Translator }>) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-12">
      <label htmlFor="price-per-person" className="sr-only">
        {t("fields.pricePerPerson")}
      </label>
      <div className="flex items-center justify-center gap-2 border-b-2 border-line-strong px-2 py-3 focus-within:border-primary">
        <span className="font-display text-4xl font-extrabold text-ink sm:text-5xl">₩</span>
        <input
          id="price-per-person"
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className="max-w-[8ch] min-w-0 bg-transparent text-center font-display text-4xl font-extrabold tracking-tight text-ink outline-none placeholder:text-muted/25 focus-visible:!outline-none sm:text-5xl"
        />
      </div>
      <p className="mt-5 text-sm leading-6 text-muted">{t("price.notice")}</p>
    </div>
  );
}

function getLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function InclusionsStep({
  value,
  onChange,
  t,
}: Readonly<{ value: string; onChange: (value: string) => void; t: Translator }>) {
  const [customInput, setCustomInput] = useState("");
  const lines = getLines(value);
  const optionLabels = INCLUSION_OPTIONS.map(({ key }) => t(`inclusions.options.${key}`));
  const customItems = lines.filter((line) => !optionLabels.includes(line));

  function toggle(label: string) {
    const next = lines.includes(label) ? lines.filter((line) => line !== label) : [...lines, label];
    onChange(next.join("\n"));
  }

  function addCustomItem() {
    const next = customInput.trim();
    if (!next || lines.includes(next)) return;
    onChange([...lines, next].join("\n"));
    setCustomInput("");
  }

  function removeCustomItem(item: string) {
    onChange(lines.filter((line) => line !== item).join("\n"));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {INCLUSION_OPTIONS.map(({ key, Icon }) => {
          const label = t(`inclusions.options.${key}`);
          const selected = lines.includes(label);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(label)}
              className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left text-sm font-bold transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-[0_6px_18px_rgba(5,150,105,0.12)]"
                  : "border-line-strong text-ink hover:border-primary/60"
              }`}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full ${
                  selected
                    ? "bg-emerald-600 text-white"
                    : "border border-primary/20 bg-white text-primary"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">{label}</span>
              {selected ? (
                <CheckIcon className="size-5 shrink-0 text-emerald-700" />
              ) : (
                <PlusIcon className="size-5 shrink-0 text-muted" />
              )}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2.5 text-sm text-ink">
        <label htmlFor="custom-inclusion-input" className="font-semibold">
          {t("inclusions.custom")}
        </label>
        <div className="flex gap-2">
          <input
            id="custom-inclusion-input"
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomItem();
              }
            }}
            className={INPUT_CLASS}
            placeholder={t("placeholders.inclusionsCustom")}
          />
          <button
            type="button"
            onClick={addCustomItem}
            disabled={!customInput.trim()}
            aria-label={t("inclusions.add")}
            className="flex size-[3.375rem] shrink-0 items-center justify-center rounded-xl border border-primary bg-white text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted/35"
          >
            <PlusIcon className="size-5" />
          </button>
        </div>
        <p className="text-sm leading-5 text-muted">{t("inclusions.customHint")}</p>
      </div>
      {customItems.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {customItems.map((item) => (
            <li
              key={item}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-emerald-500 bg-emerald-50 px-3.5 shadow-[0_5px_16px_rgba(5,150,105,0.1)]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-emerald-950">{item}</span>
              <button
                type="button"
                onClick={() => removeCustomItem(item)}
                aria-label={t("inclusions.remove", { item })}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-950"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DiscountStep({
  type,
  percent,
  endsAt,
  onTypeChange,
  onPercentChange,
  onEndsAtChange,
  t,
}: Readonly<{
  type: DiscountType;
  percent: string;
  endsAt: string;
  onTypeChange: (type: DiscountType) => void;
  onPercentChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  t: Translator;
}>) {
  const enabled = type === "limited";
  return (
    <div className="w-full space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["none", "limited"] as const).map((option) => {
          const selected = type === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onTypeChange(option)}
              className={`flex min-h-28 w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition ${
                selected
                  ? "border-primary shadow-[0_8px_24px_rgba(209,63,50,0.08)]"
                  : "border-line-strong hover:border-primary/60"
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-primary bg-primary text-white" : "border-line-strong"
                }`}
              >
                {selected ? <CheckIcon className="size-4" /> : null}
              </span>
              <span>
                <span className="block font-display text-base font-bold text-ink">
                  {t(`discount.options.${option}.title`)}
                </span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  {t(`discount.options.${option}.description`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {enabled ? (
        <div className="grid gap-5 rounded-2xl border border-primary/20 bg-white p-5 sm:grid-cols-2">
          <Field label={t("fields.discountEndsAt")}>
            <input
              type="date"
              className={INPUT_CLASS}
              value={endsAt}
              onChange={(event) => onEndsAtChange(event.target.value)}
            />
          </Field>
          <Field label={t("fields.discount")}>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                className={`${INPUT_CLASS} pr-12`}
                value={percent}
                onChange={(event) => onPercentChange(event.target.value)}
                placeholder={t("placeholders.discount")}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 right-4 -translate-y-1/2 font-bold text-muted"
              >
                %
              </span>
            </div>
          </Field>
          <p className="text-sm leading-6 text-muted sm:col-span-2">{t("discount.policyNotice")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function RestrictionsStep({
  value,
  hasNoRestrictions,
  onChange,
  onNoRestrictionsChange,
  t,
}: Readonly<{
  value: string;
  hasNoRestrictions: boolean;
  onChange: (value: string) => void;
  onNoRestrictionsChange: (value: boolean) => void;
  t: Translator;
}>) {
  const [input, setInput] = useState("");
  const lines = getLines(value);
  const optionLabels = RESTRICTION_OPTIONS.map(({ key }) => t(`restrictions.options.${key}`));
  const customItems = lines.filter((line) => !optionLabels.includes(line));

  function toggle(label: string) {
    if (hasNoRestrictions) return;
    const next = lines.includes(label) ? lines.filter((line) => line !== label) : [...lines, label];
    onChange(next.join("\n"));
  }

  function addRestriction() {
    const next = input.trim();
    if (hasNoRestrictions || !next || lines.includes(next)) return;
    onChange([...lines, next].join("\n"));
    setInput("");
  }

  function removeRestriction(item: string) {
    onChange(lines.filter((line) => line !== item).join("\n"));
  }

  return (
    <div className="w-full space-y-6">
      <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-primary/45 bg-white px-4 text-sm font-bold text-ink transition hover:border-primary">
        <input
          type="checkbox"
          checked={hasNoRestrictions}
          onChange={(event) => {
            onNoRestrictionsChange(event.target.checked);
            setInput("");
          }}
          className="size-5 accent-primary"
        />
        <span>
          <span className="block">{t("restrictions.none")}</span>
          <span className="mt-0.5 block text-xs font-medium text-muted">
            {t("restrictions.noneDescription")}
          </span>
        </span>
      </label>

      <div
        className={`space-y-6 transition ${
          hasNoRestrictions ? "pointer-events-none opacity-35 grayscale" : ""
        }`}
        aria-disabled={hasNoRestrictions}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {RESTRICTION_OPTIONS.map(({ key, Icon }) => {
            const label = t(`restrictions.options.${key}`);
            const selected = lines.includes(label);
            return (
              <button
                key={key}
                type="button"
                disabled={hasNoRestrictions}
                aria-pressed={selected}
                onClick={() => toggle(label)}
                className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left text-sm font-bold transition ${
                  selected
                    ? "border-primary bg-primary-soft text-primary-strong shadow-[0_6px_18px_rgba(209,63,50,0.12)]"
                    : "border-line-strong bg-white text-ink hover:border-primary/60"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? "bg-primary text-white"
                      : "border border-primary/20 bg-white text-primary"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">{label}</span>
                {selected ? (
                  <CheckIcon className="size-5 shrink-0 text-primary" />
                ) : (
                  <PlusIcon className="size-5 shrink-0 text-muted" />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2.5 text-sm text-ink">
          <label htmlFor="restriction-input" className="font-semibold">
            {t("restrictions.custom")}
          </label>
          <div className="flex gap-2">
            <input
              id="restriction-input"
              className={INPUT_CLASS}
              disabled={hasNoRestrictions}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addRestriction();
              }}
              placeholder={t("placeholders.restrictions")}
            />
            <button
              type="button"
              onClick={addRestriction}
              disabled={hasNoRestrictions || !input.trim()}
              aria-label={t("restrictions.add")}
              className="flex size-[54px] shrink-0 items-center justify-center rounded-xl border border-primary bg-white text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted/35"
            >
              <PlusIcon className="size-5" />
            </button>
          </div>
          <span className="text-sm leading-5 font-normal text-muted">
            {t("restrictions.customHint")}
          </span>
        </div>

        {customItems.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {customItems.map((item) => (
              <li
                key={item}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-primary bg-primary-soft px-3.5 shadow-[0_5px_16px_rgba(209,63,50,0.1)]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold text-primary-strong">{item}</span>
                <button
                  type="button"
                  onClick={() => removeRestriction(item)}
                  aria-label={t("restrictions.remove", { item })}
                  className="flex size-9 items-center justify-center rounded-full text-primary-strong transition hover:bg-white hover:text-primary"
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewStep({ draft, t }: Readonly<{ draft: ActivityCreateDraft; t: Translator }>) {
  const locale = useLocale() as Locale;
  const tActivityDetail = useTranslations("ActivityDetail");
  const tErrors = useTranslations("Errors");
  const profileResult = useMyProfile();
  const profile = profileResult?.status === "success" ? profileResult.profile : null;
  // 게스트 상세 화면과 완전히 동일한 컴포넌트로 미리보기를 그린다 (예약 진입만 차단)
  const activity = buildPreviewActivityFromDraft(draft, {
    locale,
    dateTimeUnavailable: tErrors("dateTimeUnavailable"),
    hostName: profile?.name ?? t("review.hostName"),
    hostBio: tActivityDetail("localHost"),
    hostAvatarUrl: profile?.profileImageUrl ?? null,
  });

  return (
    <div data-testid="activity-detail-preview">
      <ActivityDetailView activity={activity} preview bottomBar="inline" unoptimizedImages />
    </div>
  );
}
