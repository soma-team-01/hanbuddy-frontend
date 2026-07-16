"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagePlusIcon, MapIcon, SearchIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createMyActivity, previewActivityPrice } from "@/lib/api/buddy";
import { toSeoulStartAt } from "@/lib/datetime";
import { formatKrw } from "@/lib/format";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  getGoogleMapsApiKey,
  type GooglePlacePrediction,
  searchGooglePlacePredictions,
} from "@/lib/google/places";
import { uploadActivityImages } from "@/lib/images/presigned";
import { activityKeys } from "@/lib/query/activities";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthSessionCheck } from "@/lib/query/use-auth-session-check";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type {
  ActivityPricePreviewRequest,
  ActivityUpsertRequest,
  MyActivityStatus,
} from "@/types/buddy";
import type messages from "@/messages/en.json";

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <span className="text-sm font-medium text-ink">{children}</span>;
}

const INPUT_CLASS =
  "border-line text-ink placeholder:text-ink-soft/60 w-full rounded-xl border bg-white px-4 py-3.5 text-base";
const ADD_ROW_BUTTON_CLASS =
  "self-start rounded-full px-3 py-2 text-sm font-semibold text-earth transition-colors hover:bg-earth/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth";
const INLINE_REMOVE_BUTTON_CLASS =
  "absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";
const MAX_ACTIVITY_PHOTOS = 8;
const PLACE_SEARCH_DEBOUNCE_MS = 300;

interface SelectedActivityPhoto {
  id: number;
  file: File;
  previewUrl: string;
}

interface LocalizedMeetingPlaceAddress {
  locale: Locale;
  value: string;
}

type CreateActivityStep = 1 | 2 | 3;
type SubmissionPhase = "uploading" | "registering";

const STEP_CONTENT = {
  1: {
    title: "steps.basicsTitle",
    description: "steps.basicsDescription",
  },
  2: {
    title: "steps.scheduleTitle",
    description: "steps.scheduleDescription",
  },
  3: {
    title: "steps.meetingTitle",
    description: "steps.meetingDescription",
  },
} as const satisfies Record<CreateActivityStep, { title: string; description: string }>;

export type CreateActivityErrorKey = keyof (typeof messages)["CreateActivity"]["errors"];

interface CreateActivityValidationInput {
  step: CreateActivityStep;
  selectedPhotoCount: number;
  title: string;
  description: string;
  scheduleDateTimes: string[];
  maxCapacity: string;
  price: string;
  meetingPlaceId: string;
  meetingPointName: string;
  includedItems: string[];
}

function isPositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

export function validateCreateActivityStep({
  step,
  selectedPhotoCount,
  title,
  description,
  scheduleDateTimes,
  maxCapacity,
  price,
  meetingPlaceId,
  meetingPointName,
  includedItems,
}: CreateActivityValidationInput): CreateActivityErrorKey | null {
  if (step === 1) {
    if (selectedPhotoCount === 0) return "photosRequired";
    if (!title.trim()) return "titleRequired";
    if (!description.trim()) return "descriptionRequired";
  }

  if (step === 2) {
    if (!scheduleDateTimes.some((value) => toSeoulStartAt(value.trim()))) {
      return "scheduleRequired";
    }
    if (!isPositiveInteger(maxCapacity)) return "capacityInvalid";
    if (!isPositiveInteger(price)) return "priceInvalid";
  }

  if (step === 3) {
    if (!meetingPlaceId.trim()) return "meetingPlaceRequired";
    if (!meetingPointName.trim()) return "meetingPointNameRequired";
    if (!includedItems.some((value) => value.trim())) return "includedItemRequired";
  }

  return null;
}

function getNextStep(step: CreateActivityStep): CreateActivityStep {
  return step === 1 ? 2 : 3;
}

function getPreviousStep(step: CreateActivityStep): CreateActivityStep {
  return step === 3 ? 2 : 1;
}

function getNextRowKey(rows: number[]) {
  return rows.length === 0 ? 0 : Math.max(...rows) + 1;
}

function InlineRemoveButton({
  ariaLabel,
  title,
  onClick,
}: Readonly<{ ariaLabel: string; title: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className={INLINE_REMOVE_BUTTON_CLASS}
    >
      <TrashIcon className="size-4" />
    </button>
  );
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getStringList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function buildSchedules(formData: FormData) {
  return formData
    .getAll("scheduleDateTime")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .map((scheduleDateTime) => toSeoulStartAt(scheduleDateTime))
    .map((startAt) => (startAt ? { startAt } : null))
    .filter((schedule): schedule is { startAt: string } => schedule !== null);
}

async function uploadSelectedActivityImages(
  files: File[],
): Promise<
  | { imageKeys: string[]; errorKey: null }
  | { imageKeys: null; errorKey: Extract<CreateActivityErrorKey, "imageUploadFailed"> }
> {
  try {
    const uploadedImages = await uploadActivityImages(files);
    return { imageKeys: uploadedImages.map((image) => image.imageKey), errorKey: null };
  } catch (error) {
    if (error instanceof UnauthenticatedQueryError) throw error;
    return { imageKeys: null, errorKey: "imageUploadFailed" };
  }
}

export function CreateActivityForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("CreateActivity");
  useAuthSessionCheck();
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState<CreateActivityStep>(1);
  const [includedItems, setIncludedItems] = useState<number[]>([0]);
  const [timeSlots, setTimeSlots] = useState<number[]>([0]);
  const [restrictions, setRestrictions] = useState<number[]>([0]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedActivityPhoto[]>([]);
  const selectedPhotosRef = useRef<SelectedActivityPhoto[]>([]);
  const nextPhotoIdRef = useRef(0);
  const placeSessionTokenRef = useRef<string | null>(null);
  const selectedPlaceSessionTokenRef = useRef<{ placeId: string; sessionToken: string } | null>(
    null,
  );
  const placeSelectionVersionRef = useRef(0);
  const [meetingPlaceQuery, setMeetingPlaceQuery] = useState("");
  const [meetingPlaceId, setMeetingPlaceId] = useState("");
  const [selectedMeetingPlaceLabel, setSelectedMeetingPlaceLabel] = useState("");
  const [selectedMeetingPlaceAddress, setSelectedMeetingPlaceAddress] =
    useState<LocalizedMeetingPlaceAddress | null>(null);
  const [placePredictions, setPlacePredictions] = useState<GooglePlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [pendingPublish, setPendingPublish] = useState<FormData | null>(null);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase | null>(null);
  const [errorKey, setErrorKey] = useState<CreateActivityErrorKey | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const createActivityMutation = useMutation({
    mutationFn: async (request: ActivityUpsertRequest) =>
      unwrapApiResult(await createMyActivity(request), "activity"),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: buddyKeys.myActivities() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.scheduleDates() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
      router.push("/my-activities");
    },
  });
  const pricePreviewMutation = useMutation({
    mutationFn: async (request: ActivityPricePreviewRequest) =>
      unwrapApiResult(await previewActivityPrice(request), "preview"),
  });
  useAuthQueryRedirect(createActivityMutation.error ?? pricePreviewMutation.error);
  const googleMapsApiKey = getGoogleMapsApiKey();

  function handlePriceChange() {
    pricePreviewMutation.reset();
  }

  function handlePriceBlur(event: React.FocusEvent<HTMLInputElement>) {
    const price = Number(event.currentTarget.value);

    if (!Number.isInteger(price) || price <= 0) {
      pricePreviewMutation.reset();
      return;
    }

    pricePreviewMutation.mutate({ price, currency: "KRW" });
  }

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  useEffect(() => {
    const query = meetingPlaceQuery.trim();
    if (query.length < 3 || !googleMapsApiKey || query === selectedMeetingPlaceLabel) {
      return;
    }

    let isMounted = true;

    // Places Autocomplete는 호출당 과금되므로 타이핑이 멈춘 뒤에만 요청한다
    const timeoutId = window.setTimeout(() => {
      placeSessionTokenRef.current ??= globalThis.crypto.randomUUID();
      searchGooglePlacePredictions(query, googleMapsApiKey, {
        locale,
        fetcher: fetch,
        sessionToken: placeSessionTokenRef.current,
      })
        .then((predictions) => {
          if (!isMounted) return;
          setPlacePredictions(predictions);
        })
        .catch(() => {
          if (!isMounted) return;
          setPlacePredictions([]);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsSearchingPlaces(false);
        });
    }, PLACE_SEARCH_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [googleMapsApiKey, locale, meetingPlaceQuery, selectedMeetingPlaceLabel]);

  useEffect(() => {
    if (!meetingPlaceId || !googleMapsApiKey) return;

    const pendingSession = selectedPlaceSessionTokenRef.current;
    const sessionToken =
      pendingSession?.placeId === meetingPlaceId ? pendingSession.sessionToken : null;
    if (sessionToken) {
      selectedPlaceSessionTokenRef.current = null;
    }

    const requestVersion = ++placeSelectionVersionRef.current;
    let isActive = true;

    fetchGooglePlaceDetails(meetingPlaceId, googleMapsApiKey, {
      locale,
      fetcher: fetch,
      ...(sessionToken ? { sessionToken } : {}),
    })
      .then((place) => {
        if (
          !isActive ||
          placeSelectionVersionRef.current !== requestVersion ||
          !place.formattedAddress
        ) {
          return;
        }
        setSelectedMeetingPlaceAddress({ locale, value: place.formattedAddress });
      })
      .catch(() => {
        // Initial selection keeps its current-locale Autocomplete fallback. Locale refetch stays empty.
      });

    return () => {
      isActive = false;
    };
  }, [googleMapsApiKey, locale, meetingPlaceId]);

  const selectedFiles = selectedPhotos.map((photo) => photo.file);
  const stepContent = STEP_CONTENT[currentStep];

  function handleBack() {
    // 제출 진행 중 이탈하면 업로드/등록이 백그라운드에서 계속돼 폐기했다고 착각할 수 있으므로 무시한다
    if (submissionPhase !== null) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    router.push("/my-activities");
  }

  function validateStep(step: CreateActivityStep) {
    const form = formRef.current;
    if (!form) return false;
    const formData = new FormData(form);
    const validationError = validateCreateActivityStep({
      step,
      selectedPhotoCount: selectedFiles.length,
      title: getString(formData, "title"),
      description: getString(formData, "description"),
      scheduleDateTimes: formData
        .getAll("scheduleDateTime")
        .map((value) => (typeof value === "string" ? value : "")),
      maxCapacity: getString(formData, "maxCapacity"),
      price: getString(formData, "price"),
      meetingPlaceId,
      meetingPointName: getString(formData, "meetingPointName"),
      includedItems: formData
        .getAll("includedItems")
        .map((value) => (typeof value === "string" ? value : "")),
    });
    setErrorKey(validationError);
    return validationError === null;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) return;
    setCurrentStep(getNextStep(currentStep));
  }

  function goToPreviousStep() {
    setErrorKey(null);
    setCurrentStep(getPreviousStep(currentStep));
  }

  function handleRegisterClick() {
    if (!validateStep(3)) return;
    const form = formRef.current;
    if (!form) return;
    setPendingPublish(new FormData(form));
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep === 3) {
      handleRegisterClick();
      return;
    }
    goToNextStep();
  }

  async function submitActivity(status: MyActivityStatus, formData: FormData) {
    const meetingPointName = getString(formData, "meetingPointName");
    const selectedMeetingPlaceId = getString(formData, "meetingPlaceId");

    setErrorKey(null);
    setSubmissionPhase("uploading");

    try {
      const uploadedImages = await uploadSelectedActivityImages(selectedFiles);
      if (uploadedImages.errorKey) {
        setErrorKey(uploadedImages.errorKey);
        setSubmissionPhase(null);
        return;
      }
      setSubmissionPhase("registering");
      const request: ActivityUpsertRequest = {
        title: getString(formData, "title"),
        description: getString(formData, "description"),
        imageKeys: uploadedImages.imageKeys,
        includedItems: getStringList(formData, "includedItems"),
        restrictionNotes: getStringList(formData, "restrictionNotes"),
        maxCapacity: Number(getString(formData, "maxCapacity")),
        price: Number(getString(formData, "price")),
        currency: "KRW",
        meetingPointName,
        meetingPlaceId: selectedMeetingPlaceId,
        status,
        schedules: buildSchedules(formData),
      };
      await createActivityMutation.mutateAsync(request);
    } catch (error) {
      if (error instanceof UnauthenticatedQueryError) return;
      setErrorKey("submissionFailed");
      setSubmissionPhase(null);
    }
  }

  function handlePlaceQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    placeSelectionVersionRef.current += 1;
    if (value.trim().length < 3) {
      placeSessionTokenRef.current = null;
    }
    selectedPlaceSessionTokenRef.current = null;
    setMeetingPlaceQuery(value);
    setMeetingPlaceId("");
    setSelectedMeetingPlaceLabel("");
    setSelectedMeetingPlaceAddress(null);
    setPlacePredictions([]);
    setIsSearchingPlaces(value.trim().length >= 3 && Boolean(googleMapsApiKey));
  }

  function handlePlaceSelect(prediction: GooglePlacePrediction) {
    const fallbackAddress =
      prediction.secondaryText || (prediction.text !== prediction.mainText ? prediction.text : "");
    const sessionToken = placeSessionTokenRef.current;
    placeSelectionVersionRef.current += 1;
    placeSessionTokenRef.current = null;
    selectedPlaceSessionTokenRef.current = sessionToken
      ? { placeId: prediction.placeId, sessionToken }
      : null;

    setMeetingPlaceId(prediction.placeId);
    setMeetingPlaceQuery(prediction.mainText);
    setSelectedMeetingPlaceLabel(prediction.mainText);
    setSelectedMeetingPlaceAddress(fallbackAddress ? { locale, value: fallbackAddress } : null);
    setPlacePredictions([]);
  }

  function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    // Strict Mode가 updater를 이중 호출해도 blob URL이 누수되지 않도록 부수효과는 updater 밖에서 수행한다
    const remainingSlots = Math.max(MAX_ACTIVITY_PHOTOS - selectedPhotos.length, 0);
    const acceptedFiles = files.slice(0, remainingSlots);
    const nextPhotos = acceptedFiles.map((file) => ({
      id: nextPhotoIdRef.current++,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedPhotos((photos) => [...photos, ...nextPhotos]);
  }

  function removeSelectedPhoto(photoId: number) {
    const removedPhoto = selectedPhotos.find((photo) => photo.id === photoId);
    if (!removedPhoto) return;

    URL.revokeObjectURL(removedPhoto.previewUrl);
    setSelectedPhotos((photos) => photos.filter((photo) => photo.id !== photoId));
    setIsDirty(true);
  }

  function addIncludedItem() {
    setIncludedItems((items) => [...items, getNextRowKey(items)]);
    setIsDirty(true);
  }

  function removeIncludedItem(key: number) {
    setIncludedItems((items) => items.filter((item) => item !== key));
    setIsDirty(true);
  }

  function addTimeSlot() {
    setTimeSlots((slots) => [...slots, getNextRowKey(slots)]);
    setIsDirty(true);
  }

  function removeTimeSlot(key: number) {
    setTimeSlots((slots) => slots.filter((slot) => slot !== key));
    setIsDirty(true);
  }

  function addRestriction() {
    setRestrictions((items) => [...items, getNextRowKey(items)]);
    setIsDirty(true);
  }

  function removeRestriction(key: number) {
    setRestrictions((items) => items.filter((item) => item !== key));
    setIsDirty(true);
  }

  const isSubmitting = submissionPhase !== null;
  const meetingMapUrl = meetingPlaceId
    ? buildGoogleMapsEmbedUrl(meetingPlaceId, googleMapsApiKey, locale)
    : "";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleFormSubmit}
      onChange={() => setIsDirty(true)}
      className="flex flex-1 flex-col pb-28"
    >
      <TopAppBar onLeftClick={handleBack} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <p className="font-display text-xs font-semibold tracking-widest text-earth uppercase">
            {t("steps.progress", { current: currentStep, total: 3 })}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-forest">
            {t(stepContent.title)}
          </h1>
          <p className="mt-2 text-ink-soft">{t(stepContent.description)}</p>
        </div>

        {errorKey ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {t(`errors.${errorKey}`)}
          </p>
        ) : null}

        <section hidden={currentStep !== 1} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-white/60 px-6 py-14 text-ink-soft">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label={t("activityPhotos")}
                className="sr-only"
                onChange={handlePhotoSelection}
              />
              <ImagePlusIcon className="size-8" />
              <span className="font-display text-sm font-semibold text-ink">
                {t("uploadPhotos")}
              </span>
              <span className="text-xs">
                {selectedFiles.length > 0
                  ? t("selectedPhotos", { count: selectedFiles.length })
                  : t("photoHint")}
              </span>
            </label>

            {selectedPhotos.length > 0 ? (
              <ul aria-label={t("selectedPhotosList")} className="grid grid-cols-4 gap-2">
                {selectedPhotos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white"
                  >
                    <Image
                      src={photo.previewUrl}
                      alt={photo.file.name}
                      fill
                      sizes="72px"
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      aria-label={t("removePhoto", { name: photo.file.name })}
                      onClick={() => removeSelectedPhoto(photo.id)}
                      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/80 text-cream transition-colors hover:bg-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="flex flex-col gap-2">
            <FieldLabel>{t("activityTitle")}</FieldLabel>
            <input
              type="text"
              name="title"
              required
              placeholder={t("titlePlaceholder")}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-2">
            <FieldLabel>{t("description")}</FieldLabel>
            <textarea
              name="description"
              required
              rows={4}
              placeholder={t("descriptionPlaceholder")}
              className={`${INPUT_CLASS} resize-none`}
            />
          </label>
        </section>

        <section hidden={currentStep !== 2} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <FieldLabel>{t("availability")}</FieldLabel>
            <p className="text-xs text-ink-soft">{t("kstNotice")}</p>
            {timeSlots.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="scheduleDateTime"
                  type="datetime-local"
                  required={index === 0}
                  aria-label={t("availableSchedule")}
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={t("removeTimeSlot", { index: index + 1 })}
                    title={t("removeTimeSlotTitle")}
                    onClick={() => removeTimeSlot(key)}
                  />
                ) : null}
              </div>
            ))}
            <button
              type="button"
              aria-label={t("addTimeSlot")}
              onClick={addTimeSlot}
              className={ADD_ROW_BUTTON_CLASS}
            >
              + {t("addTimeSlot")}
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <FieldLabel>{t("maxCapacity")}</FieldLabel>
            <span className="relative">
              <UsersIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                name="maxCapacity"
                type="number"
                min={1}
                required
                placeholder={t("capacityPlaceholder", { count: 4 })}
                className={`${INPUT_CLASS} pl-11`}
              />
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <FieldLabel>{t("pricePerPerson")}</FieldLabel>
            <span className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-ink-soft">
                ₩
              </span>
              <input
                name="price"
                type="number"
                min={1}
                step={1}
                required
                aria-label={t("pricePerPerson")}
                placeholder={t("pricePlaceholder")}
                className={`${INPUT_CLASS} pl-11`}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
              />
            </span>
            {pricePreviewMutation.isPending ? (
              <output className="text-xs text-ink-soft">{t("payoutLoading")}</output>
            ) : null}
            {pricePreviewMutation.error ? (
              <span role="alert" aria-label={t("payoutErrorLabel")} className="text-xs text-danger">
                {t("payoutError")}
              </span>
            ) : null}
            {pricePreviewMutation.data ? (
              <dl
                aria-label={t("payoutSummary", {
                  amount: pricePreviewMutation.data.estimatedGuidePayoutAmountKrw,
                })}
                className="flex flex-col gap-2 rounded-xl bg-chip px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between text-ink-soft">
                  <dt>{t("platformFee", { rate: pricePreviewMutation.data.commissionRate })}</dt>
                  <dd>
                    {formatKrw(pricePreviewMutation.data.platformCommissionAmountKrw, locale)}
                  </dd>
                </div>
                <div className="flex items-center justify-between font-semibold text-forest">
                  <dt>{t("estimatedPayout")}</dt>
                  <dd>
                    {formatKrw(pricePreviewMutation.data.estimatedGuidePayoutAmountKrw, locale)}
                  </dd>
                </div>
              </dl>
            ) : null}
          </label>
        </section>

        <section hidden={currentStep !== 3} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <FieldLabel>{t("meetingPoint")}</FieldLabel>
            <label className="flex flex-col">
              <span className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={meetingPlaceQuery}
                  onChange={handlePlaceQueryChange}
                  placeholder={t("placeSearchPlaceholder")}
                  aria-label={t("placeSearch")}
                  className={`${INPUT_CLASS} pl-11`}
                />
              </span>
            </label>
            {!googleMapsApiKey ? (
              <p className="px-1 text-xs text-ink-soft">{t("placeSearchUnavailable")}</p>
            ) : null}
            <input type="hidden" name="meetingPlaceId" value={meetingPlaceId} />
            {placePredictions.length > 0 ? (
              <ul
                aria-label={t("placeResults")}
                className="overflow-hidden rounded-xl border border-line bg-white"
              >
                {placePredictions.map((prediction) => (
                  <li key={prediction.placeId}>
                    <button
                      type="button"
                      onClick={() => handlePlaceSelect(prediction)}
                      className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-chip"
                    >
                      <span className="text-sm font-semibold text-ink">{prediction.mainText}</span>
                      {prediction.secondaryText ? (
                        <span className="text-xs text-ink-soft">{prediction.secondaryText}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {isSearchingPlaces ? (
              <p className="px-1 text-xs text-ink-soft">{t("placeSearchLoading")}</p>
            ) : null}
            {selectedMeetingPlaceAddress?.locale === locale ? (
              <p className="px-1 text-xs text-ink-soft">{selectedMeetingPlaceAddress.value}</p>
            ) : null}
            {meetingMapUrl ? (
              <iframe
                title={t("mapTitle")}
                src={meetingMapUrl}
                className="h-40 w-full rounded-xl border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-line/60 text-ink-soft">
                <MapIcon className="size-6" />
                <span className="text-sm">{t("mapFallback")}</span>
              </div>
            )}
            <label className="mt-2 flex flex-col gap-2">
              <FieldLabel>{t("meetingPointName")}</FieldLabel>
              <input
                name="meetingPointName"
                type="text"
                required
                placeholder={t("meetingPointNamePlaceholder")}
                aria-label={t("meetingPointName")}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <div
            role="group"
            aria-label={t("includedItemsCount", { count: includedItems.length })}
            className="flex flex-col gap-2"
          >
            <FieldLabel>{t("included")}</FieldLabel>
            {includedItems.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="includedItems"
                  type="text"
                  required={index === 0}
                  placeholder={t("includedItemPlaceholder")}
                  aria-label={t("includedItem")}
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={t("removeIncludedItem", { index: index + 1 })}
                    title={t("removeIncludedItemTitle")}
                    onClick={() => removeIncludedItem(key)}
                  />
                ) : null}
              </div>
            ))}
            <button
              type="button"
              aria-label={t("addIncludedItem")}
              onClick={addIncludedItem}
              className={ADD_ROW_BUTTON_CLASS}
            >
              + {t("addIncludedItem")}
            </button>
          </div>

          <div
            role="group"
            aria-label={t("restrictionsCount", { count: restrictions.length })}
            className="flex flex-col gap-2"
          >
            <FieldLabel>{t("restrictions")}</FieldLabel>
            {restrictions.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="restrictionNotes"
                  type="text"
                  placeholder={t("restrictionPlaceholder")}
                  aria-label={t("restriction")}
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={t("removeRestriction", { index: index + 1 })}
                    title={t("removeRestrictionTitle")}
                    onClick={() => removeRestriction(key)}
                  />
                ) : null}
              </div>
            ))}
            <button
              type="button"
              aria-label={t("addRestriction")}
              onClick={addRestriction}
              className={ADD_ROW_BUTTON_CLASS}
            >
              + {t("addRestriction")}
            </button>
          </div>
        </section>
      </main>
      <BottomActionBar>
        <button
          type="button"
          onClick={currentStep === 1 ? handleBack : goToPreviousStep}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl border border-line bg-chip font-display text-sm font-semibold text-ink transition-colors enabled:hover:border-line-strong enabled:hover:bg-line disabled:cursor-not-allowed disabled:opacity-60"
        >
          {currentStep === 1 ? t("cancel") : t("previous")}
        </button>
        <button
          type="button"
          onClick={currentStep === 3 ? handleRegisterClick : goToNextStep}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream transition-colors enabled:hover:bg-forest-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submissionPhase === "uploading"
            ? t("uploadingPhotos")
            : submissionPhase === "registering"
              ? t("registering")
              : currentStep === 3
                ? t("registerActivity")
                : t("next")}
        </button>
      </BottomActionBar>
      {pendingPublish && (
        <ConfirmDialog
          title={t("registerTitle")}
          description={t("registerDescription")}
          confirmLabel={t("register")}
          onConfirm={() => {
            const formData = pendingPublish;
            setPendingPublish(null);
            void submitActivity("ACTIVE", formData);
          }}
          onClose={() => setPendingPublish(null)}
        />
      )}
      {showDiscardConfirm && (
        <ConfirmDialog
          title={t("discardTitle")}
          description={t("discardDescription")}
          confirmLabel={t("discard")}
          tone="danger"
          onConfirm={() => router.push("/my-activities")}
          onClose={() => setShowDiscardConfirm(false)}
        />
      )}
    </form>
  );
}
