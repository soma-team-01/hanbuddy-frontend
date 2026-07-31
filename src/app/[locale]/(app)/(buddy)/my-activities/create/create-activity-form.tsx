"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagePlusIcon, MapIcon, SearchIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createMyActivity, previewActivityPrice } from "@/lib/api/buddy";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
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
  "border-line-soft text-ink placeholder:text-muted/70 w-full rounded-2xl border bg-canvas-soft px-4 py-4 text-base";
const ADD_ROW_BUTTON_CLASS =
  "self-start rounded-full px-3 py-2 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";
const INLINE_REMOVE_BUTTON_CLASS =
  "absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";
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

function validateActivityBasics({
  selectedPhotoCount,
  title,
  description,
}: CreateActivityValidationInput): CreateActivityErrorKey | null {
  if (selectedPhotoCount === 0) return "photosRequired";
  if (!title.trim()) return "titleRequired";
  if (!description.trim()) return "descriptionRequired";
  return null;
}

function validateScheduleAndPricing({
  scheduleDateTimes,
  maxCapacity,
  price,
}: CreateActivityValidationInput): CreateActivityErrorKey | null {
  if (!scheduleDateTimes.some((value) => toSeoulStartAt(value.trim()))) {
    return "scheduleRequired";
  }
  if (!isPositiveInteger(maxCapacity)) return "capacityInvalid";
  if (!isPositiveInteger(price)) return "priceInvalid";
  return null;
}

function validateMeetingDetails({
  meetingPlaceId,
  meetingPointName,
  includedItems,
}: CreateActivityValidationInput): CreateActivityErrorKey | null {
  if (!meetingPlaceId.trim()) return "meetingPlaceRequired";
  if (!meetingPointName.trim()) return "meetingPointNameRequired";
  if (!includedItems.some((value) => value.trim())) return "includedItemRequired";
  return null;
}

const CREATE_ACTIVITY_STEP_VALIDATORS = {
  1: validateActivityBasics,
  2: validateScheduleAndPricing,
  3: validateMeetingDetails,
} satisfies Record<
  CreateActivityStep,
  (input: CreateActivityValidationInput) => CreateActivityErrorKey | null
>;

export function validateCreateActivityStep(
  input: CreateActivityValidationInput,
): CreateActivityErrorKey | null {
  return CREATE_ACTIVITY_STEP_VALIDATORS[input.step](input);
}

function getNextStep(step: CreateActivityStep): CreateActivityStep {
  return step === 1 ? 2 : 3;
}

function getPreviousStep(step: CreateActivityStep): CreateActivityStep {
  return step === 3 ? 2 : 1;
}

function getPrimaryActionLabelKey(
  submissionPhase: SubmissionPhase | null,
  currentStep: CreateActivityStep,
) {
  if (submissionPhase === "uploading") return "uploadingPhotos";
  if (submissionPhase === "registering") return "registering";
  return currentStep === 3 ? "registerActivity" : "next";
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
): Promise<{ imageKeys: string[]; error: null } | { imageKeys: null; error: unknown }> {
  try {
    const uploadedImages = await uploadActivityImages(files);
    return { imageKeys: uploadedImages.map((image) => image.imageKey), error: null };
  } catch (error) {
    if (error instanceof UnauthenticatedQueryError) throw error;
    return { imageKeys: null, error };
  }
}

type MeetingPlaceFeedbackProps = Readonly<{
  googleMapsApiKey: string;
  isSearchingPlaces: boolean;
  meetingMapUrl: string;
  onPlaceSelect: (prediction: GooglePlacePrediction, predictionLocale: Locale) => void;
  placePredictions: { locale: Locale; values: GooglePlacePrediction[] } | null;
  selectedMeetingPlaceAddress: LocalizedMeetingPlaceAddress | null;
}>;

function MeetingPlaceFeedback({
  googleMapsApiKey,
  isSearchingPlaces,
  meetingMapUrl,
  onPlaceSelect,
  placePredictions,
  selectedMeetingPlaceAddress,
}: MeetingPlaceFeedbackProps) {
  const locale = useLocale();
  const t = useTranslations("CreateActivity");

  return (
    <>
      {!googleMapsApiKey ? (
        <p className="px-1 text-xs text-muted">{t("placeSearchUnavailable")}</p>
      ) : null}
      {placePredictions?.locale === locale && placePredictions.values.length > 0 ? (
        <ul
          aria-label={t("placeResults")}
          className="overflow-hidden rounded-xl border border-line-soft bg-panel"
        >
          {placePredictions.values.map((prediction) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                onClick={() => onPlaceSelect(prediction, placePredictions.locale)}
                className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-primary-soft"
              >
                <span className="text-sm font-semibold text-ink">{prediction.mainText}</span>
                {prediction.secondaryText ? (
                  <span className="text-xs text-muted">{prediction.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isSearchingPlaces ? (
        <p className="px-1 text-xs text-muted">{t("placeSearchLoading")}</p>
      ) : null}
      {selectedMeetingPlaceAddress?.locale === locale ? (
        <p className="px-1 text-xs text-muted">{selectedMeetingPlaceAddress.value}</p>
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
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-panel-raised text-muted">
          <MapIcon className="size-6" />
          <span className="text-sm">{t("mapFallback")}</span>
        </div>
      )}
    </>
  );
}

export function CreateActivityForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const activeLocaleRef = useRef(locale);
  const t = useTranslations("CreateActivity");
  const getApiErrorMessage = useApiErrorMessage();
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
  const placeSearchVersionRef = useRef(0);
  const [meetingPlaceQuery, setMeetingPlaceQuery] = useState("");
  const [meetingPlaceId, setMeetingPlaceId] = useState("");
  const [selectedMeetingPlaceLabel, setSelectedMeetingPlaceLabel] = useState("");
  const [selectedMeetingPlaceAddress, setSelectedMeetingPlaceAddress] =
    useState<LocalizedMeetingPlaceAddress | null>(null);
  const [placePredictions, setPlacePredictions] = useState<{
    locale: Locale;
    values: GooglePlacePrediction[];
  } | null>(null);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [pendingPublish, setPendingPublish] = useState<FormData | null>(null);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase | null>(null);
  const [submissionAuthError, setSubmissionAuthError] = useState<UnauthenticatedQueryError | null>(
    null,
  );
  const [errorKey, setErrorKey] = useState<CreateActivityErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: Extract<CreateActivityErrorKey, "imageUploadFailed" | "submissionFailed">;
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  useEffect(() => {
    activeLocaleRef.current = locale;
  }, [locale]);
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
  useAuthQueryRedirect(
    submissionAuthError ??
      (requestFailure?.error instanceof Error ? requestFailure.error : null) ??
      createActivityMutation.error ??
      pricePreviewMutation.error,
  );
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
    if (!query || !googleMapsApiKey || query === selectedMeetingPlaceLabel) {
      return;
    }

    const requestVersion = ++placeSearchVersionRef.current;
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
          if (!isMounted || placeSearchVersionRef.current !== requestVersion) return;
          setPlacePredictions({ locale, values: predictions });
        })
        .catch(() => {
          if (!isMounted || placeSearchVersionRef.current !== requestVersion) return;
          setPlacePredictions({ locale, values: [] });
        })
        .finally(() => {
          if (!isMounted || placeSearchVersionRef.current !== requestVersion) return;
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
    setRequestFailure(null);
    setErrorKey(validationError);
    return validationError === null;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) return;
    setCurrentStep(getNextStep(currentStep));
  }

  function goToPreviousStep() {
    setRequestFailure(null);
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
    setRequestFailure(null);
    setSubmissionAuthError(null);
    setSubmissionPhase("uploading");

    try {
      const uploadedImages = await uploadSelectedActivityImages(selectedFiles);
      if (uploadedImages.imageKeys === null) {
        setRequestFailure({ error: uploadedImages.error, fallbackKey: "imageUploadFailed" });
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
      if (error instanceof UnauthenticatedQueryError) {
        setSubmissionPhase(null);
        setSubmissionAuthError(error);
        return;
      }
      setRequestFailure({ error, fallbackKey: "submissionFailed" });
      setSubmissionPhase(null);
    }
  }

  function handlePlaceQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    placeSelectionVersionRef.current += 1;
    placeSearchVersionRef.current += 1;
    if (!value.trim()) {
      placeSessionTokenRef.current = null;
    }
    selectedPlaceSessionTokenRef.current = null;
    setMeetingPlaceQuery(value);
    setMeetingPlaceId("");
    setSelectedMeetingPlaceLabel("");
    setSelectedMeetingPlaceAddress(null);
    setPlacePredictions(null);
    setIsSearchingPlaces(Boolean(value.trim()) && Boolean(googleMapsApiKey));
  }

  function handlePlaceSelect(prediction: GooglePlacePrediction, predictionLocale: Locale) {
    if (predictionLocale !== activeLocaleRef.current) return;

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
    setSelectedMeetingPlaceAddress(
      fallbackAddress ? { locale: predictionLocale, value: fallbackAddress } : null,
    );
    setPlacePredictions(null);
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
  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(
      requestFailure.error,
      t(`errors.${requestFailure.fallbackKey}`),
    );
  } else if (errorKey) {
    errorMessage = t(`errors.${errorKey}`);
  }

  return (
    <div className="flex flex-1 flex-col bg-canvas pb-28 lg:pb-0">
      <PageHeader onLeftClick={handleBack} />
      <main className="flex-1 py-6 md:py-10">
        <PageContainer className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
          <aside className="mb-8 hidden lg:block">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              Create activity
            </p>
            <h2 className="mt-5 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em]">
              Share your experience with travelers
            </h2>
            <ol className="mt-12 flex flex-col gap-4 text-sm">
              {(["Basics", "Details & pricing", "Meeting point"] as const).map((step, index) => (
                <li
                  key={step}
                  className={`flex items-center gap-3 ${currentStep === index + 1 ? "font-bold text-ink" : "text-muted"}`}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full font-display ${currentStep === index + 1 ? "bg-primary text-white" : index + 1 < currentStep ? "bg-success text-white" : "border border-line-strong"}`}
                  >
                    {index + 1 < currentStep ? "✓" : index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-16 text-xs text-muted">● Draft saved just now</p>
          </aside>
          <form
            ref={formRef}
            data-testid="create-activity-form"
            noValidate
            onSubmit={handleFormSubmit}
            onChange={() => setIsDirty(true)}
            className="mx-auto w-full max-w-[800px] space-y-8"
          >
            <div>
              <p className="font-display text-xs font-bold tracking-widest text-primary-strong uppercase">
                {t("steps.progress", { current: currentStep, total: 3 })}
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] text-ink">
                {t(stepContent.title)}
              </h1>
              <p className="mt-2 text-muted">{t(stepContent.description)}</p>
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {errorMessage}
              </p>
            ) : null}

            <section hidden={currentStep !== 1} className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-panel/60 px-6 py-14 text-muted">
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
                        className="relative aspect-square overflow-hidden rounded-xl border border-line-soft bg-panel"
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
                          className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/80 text-on-primary transition-colors hover:bg-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
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

            <section
              hidden={currentStep !== 2}
              data-testid="create-activity-primary-fields"
              className="grid gap-6 md:grid-cols-2"
            >
              <div className="flex flex-col gap-2 md:col-span-2">
                <FieldLabel>{t("availability")}</FieldLabel>
                <p className="text-xs text-muted">{t("kstNotice")}</p>
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
                  <UsersIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
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
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-muted">
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
                  <output className="text-xs text-muted">{t("payoutLoading")}</output>
                ) : null}
                {pricePreviewMutation.error ? (
                  <span
                    role="alert"
                    aria-label={t("payoutErrorLabel")}
                    className="text-xs text-danger"
                  >
                    {getApiErrorMessage(pricePreviewMutation.error, t("payoutError"))}
                  </span>
                ) : null}
                {pricePreviewMutation.data ? (
                  <dl
                    aria-label={t("payoutSummary", {
                      amount: pricePreviewMutation.data.estimatedGuidePayoutAmountKrw,
                    })}
                    className="flex flex-col gap-2 rounded-xl bg-panel-raised px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between text-muted">
                      <dt>
                        {t("platformFee", { rate: pricePreviewMutation.data.commissionRate })}
                      </dt>
                      <dd>
                        {formatKrw(pricePreviewMutation.data.platformCommissionAmountKrw, locale)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-primary-strong">
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
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
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
                <input type="hidden" name="meetingPlaceId" value={meetingPlaceId} />
                <MeetingPlaceFeedback
                  googleMapsApiKey={googleMapsApiKey}
                  isSearchingPlaces={isSearchingPlaces}
                  meetingMapUrl={meetingMapUrl}
                  onPlaceSelect={handlePlaceSelect}
                  placePredictions={placePredictions}
                  selectedMeetingPlaceAddress={selectedMeetingPlaceAddress}
                />
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

              <fieldset
                aria-label={t("includedItemsCount", { count: includedItems.length })}
                className="flex min-w-0 flex-col gap-2 border-0 p-0"
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
              </fieldset>

              <fieldset
                aria-label={t("restrictionsCount", { count: restrictions.length })}
                className="flex min-w-0 flex-col gap-2 border-0 p-0"
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
              </fieldset>
            </section>
            <BottomActionBar>
              <button
                type="button"
                onClick={currentStep === 1 ? handleBack : goToPreviousStep}
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-xl border border-line-strong bg-panel font-display text-sm font-semibold text-ink transition-colors enabled:hover:bg-panel-raised disabled:cursor-not-allowed disabled:opacity-60"
              >
                {currentStep === 1 ? t("cancel") : t("previous")}
              </button>
              <button
                type="button"
                onClick={currentStep === 3 ? handleRegisterClick : goToNextStep}
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-xl bg-primary font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t(getPrimaryActionLabelKey(submissionPhase, currentStep))}
              </button>
            </BottomActionBar>
          </form>
        </PageContainer>
      </main>
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
    </div>
  );
}
