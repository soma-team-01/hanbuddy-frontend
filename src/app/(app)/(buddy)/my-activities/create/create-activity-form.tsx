"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagePlusIcon, MapIcon, SearchIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { createMyActivity } from "@/lib/api/buddy";
import {
  buildGoogleMapsEmbedUrl,
  getGoogleMapsApiKey,
  GOOGLE_PLACE_COMPAT_ADDRESS,
  type GooglePlacePrediction,
  searchGooglePlacePredictions,
} from "@/lib/google/places";
import { uploadActivityImages } from "@/lib/images/presigned";
import type { ActivityUpsertRequest, MyActivityStatus } from "@/types/buddy";

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

type CreateActivityStep = 1 | 2 | 3;

interface StepContent {
  eyebrow: string;
  title: string;
  description: string;
}

type ValidatableControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const STEP_CONTENT: Record<CreateActivityStep, StepContent> = {
  1: {
    eyebrow: "Step 1 of 3",
    title: "Activity Basics",
    description: "Add photos and describe the experience guests will discover.",
  },
  2: {
    eyebrow: "Step 2 of 3",
    title: "Schedule & Pricing",
    description: "Set when guests can join, how many can attend, and what it costs.",
  },
  3: {
    eyebrow: "Step 3 of 3",
    title: "Meeting Details",
    description: "Share the meeting place, included items, and participation limits.",
  },
};

const STEP_FIELD_NAMES: Record<CreateActivityStep, string[]> = {
  1: ["title", "description"],
  2: ["scheduleDateTime", "maxCapacity", "price"],
  3: ["meetingPointName", "includedItems"],
};

function getNextStep(step: CreateActivityStep): CreateActivityStep {
  return step === 1 ? 2 : 3;
}

function getPreviousStep(step: CreateActivityStep): CreateActivityStep {
  return step === 3 ? 2 : 1;
}

function isValidatableControl(element: Element): element is ValidatableControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
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
    .map((scheduleDateTime) => {
      const [activityDate, startTime = ""] = scheduleDateTime.split("T");
      return {
        activityDate,
        startTime: startTime.slice(0, 5),
      };
    })
    .filter((schedule) => schedule.activityDate && schedule.startTime);
}

export function CreateActivityForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState<CreateActivityStep>(1);
  const [includedItems, setIncludedItems] = useState<number[]>([0]);
  const [timeSlots, setTimeSlots] = useState<number[]>([0]);
  const [restrictions, setRestrictions] = useState<number[]>([0]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedActivityPhoto[]>([]);
  const selectedPhotosRef = useRef<SelectedActivityPhoto[]>([]);
  const nextPhotoIdRef = useRef(0);
  const [meetingPlaceQuery, setMeetingPlaceQuery] = useState("");
  const [meetingPlaceId, setMeetingPlaceId] = useState("");
  const [selectedMeetingPlaceLabel, setSelectedMeetingPlaceLabel] = useState("");
  const [selectedMeetingPlaceAddress, setSelectedMeetingPlaceAddress] = useState("");
  const [placePredictions, setPlacePredictions] = useState<GooglePlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [pendingPublish, setPendingPublish] = useState<FormData | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<MyActivityStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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
    const apiKey = getGoogleMapsApiKey();
    const query = meetingPlaceQuery.trim();
    if (query.length < 3 || !apiKey || query === selectedMeetingPlaceLabel) {
      return;
    }

    let isMounted = true;

    // Places Autocomplete는 호출당 과금되므로 타이핑이 멈춘 뒤에만 요청한다
    const timeoutId = window.setTimeout(() => {
      searchGooglePlacePredictions(query, apiKey)
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
  }, [meetingPlaceQuery, selectedMeetingPlaceLabel]);

  const selectedFiles = selectedPhotos.map((photo) => photo.file);
  const stepContent = STEP_CONTENT[currentStep];

  function handleBack() {
    // 제출 진행 중 이탈하면 업로드/등록이 백그라운드에서 계속돼 폐기했다고 착각할 수 있으므로 무시한다
    if (submittingStatus !== null) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    router.push("/my-activities");
  }

  function validateNamedControls(fieldNames: string[]) {
    const form = formRef.current;
    if (!form) return false;

    const controls = Array.from(form.elements).filter(isValidatableControl);
    for (const fieldName of fieldNames) {
      for (const control of controls.filter((element) => element.name === fieldName)) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return false;
        }
      }
    }
    return true;
  }

  function validateStep(step: CreateActivityStep) {
    setErrorMessage("");
    if (step === 1 && selectedFiles.length === 0) {
      setErrorMessage("Please select at least one activity photo.");
      return false;
    }
    if (!validateNamedControls(STEP_FIELD_NAMES[step])) {
      return false;
    }
    if (step === 3 && !meetingPlaceId) {
      setErrorMessage("Please select a Google place from the results.");
      return false;
    }
    return true;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) return;
    setCurrentStep(getNextStep(currentStep));
  }

  function goToPreviousStep() {
    setErrorMessage("");
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

    setErrorMessage("");
    setSubmittingStatus(status);

    try {
      const uploadedImages = await uploadActivityImages(selectedFiles);
      const request: ActivityUpsertRequest = {
        title: getString(formData, "title"),
        description: getString(formData, "description"),
        imageKeys: uploadedImages.map((image) => image.imageKey),
        includedItems: getStringList(formData, "includedItems"),
        restrictionNotes: getStringList(formData, "restrictionNotes"),
        maxCapacity: Number(getString(formData, "maxCapacity")),
        price: Number(getString(formData, "price")),
        currency: "KRW",
        meetingPointName,
        meetingPointAddress: selectedMeetingPlaceAddress || GOOGLE_PLACE_COMPAT_ADDRESS,
        meetingPlaceId: selectedMeetingPlaceId,
        status,
        schedules: buildSchedules(formData),
      };
      const result = await createMyActivity(request);

      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        setSubmittingStatus(null);
        return;
      }

      router.push("/my-activities");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to register the activity.");
      setSubmittingStatus(null);
    }
  }

  function handlePlaceQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setMeetingPlaceQuery(value);
    setMeetingPlaceId("");
    setSelectedMeetingPlaceLabel("");
    setSelectedMeetingPlaceAddress("");
    setPlacePredictions([]);
    setIsSearchingPlaces(value.trim().length >= 3 && Boolean(getGoogleMapsApiKey()));
  }

  function handlePlaceSelect(prediction: GooglePlacePrediction) {
    const address =
      prediction.secondaryText || (prediction.text !== prediction.mainText ? prediction.text : "");

    setMeetingPlaceId(prediction.placeId);
    setMeetingPlaceQuery(prediction.mainText);
    setSelectedMeetingPlaceLabel(prediction.mainText);
    setSelectedMeetingPlaceAddress(address);
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

  const isSubmitting = submittingStatus !== null;
  const meetingMapUrl = meetingPlaceId
    ? buildGoogleMapsEmbedUrl(meetingPlaceId, getGoogleMapsApiKey())
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
            {stepContent.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-forest">
            {stepContent.title}
          </h1>
          <p className="mt-2 text-ink-soft">{stepContent.description}</p>
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
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-white/60 px-6 py-14 text-ink-soft">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="Activity photos"
                className="sr-only"
                onChange={handlePhotoSelection}
              />
              <ImagePlusIcon className="size-8" />
              <span className="font-display text-sm font-semibold text-ink">
                Click to upload activity photos
              </span>
              <span className="text-xs">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} selected`
                  : "PNG, JPG, WebP up to 8 files"}
              </span>
            </label>

            {selectedPhotos.length > 0 ? (
              <ul aria-label="Selected activity photos" className="grid grid-cols-4 gap-2">
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
                      aria-label={`Remove photo ${photo.file.name}`}
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
            <FieldLabel>Activity Title</FieldLabel>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g., Traditional Tea Ceremony Experience"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-2">
            <FieldLabel>Description</FieldLabel>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Describe what participants will do and learn..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </label>
        </section>

        <section hidden={currentStep !== 2} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <FieldLabel>Availability</FieldLabel>
            {timeSlots.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="scheduleDateTime"
                  type="datetime-local"
                  required={index === 0}
                  aria-label="Available schedule"
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={`Remove time slot ${index + 1}`}
                    title="Remove time slot"
                    onClick={() => removeTimeSlot(key)}
                  />
                ) : null}
              </div>
            ))}
            <button type="button" onClick={addTimeSlot} className={ADD_ROW_BUTTON_CLASS}>
              + Add time slot
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <FieldLabel>Max Capacity</FieldLabel>
            <span className="relative">
              <UsersIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
              <input
                name="maxCapacity"
                type="number"
                min={1}
                required
                placeholder="e.g., 4"
                className={`${INPUT_CLASS} pl-11`}
              />
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <FieldLabel>Price per person</FieldLabel>
            <span className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-ink-soft">
                ₩
              </span>
              <input
                name="price"
                type="number"
                min={0}
                required
                aria-label="Price per person"
                placeholder="e.g., 50000"
                className={`${INPUT_CLASS} pl-11`}
              />
            </span>
          </label>
        </section>

        <section hidden={currentStep !== 3} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <FieldLabel>Meeting Point</FieldLabel>
            <label className="flex flex-col">
              <span className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={meetingPlaceQuery}
                  onChange={handlePlaceQueryChange}
                  placeholder="e.g., Anguk Station"
                  aria-label="Search Google place"
                  className={`${INPUT_CLASS} pl-11`}
                />
              </span>
            </label>
            <input type="hidden" name="meetingPlaceId" value={meetingPlaceId} />
            {placePredictions.length > 0 ? (
              <ul
                aria-label="Google place results"
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
              <p className="px-1 text-xs text-ink-soft">Searching places...</p>
            ) : null}
            {selectedMeetingPlaceAddress ? (
              <p className="px-1 text-xs text-ink-soft">{selectedMeetingPlaceAddress}</p>
            ) : null}
            {meetingMapUrl ? (
              <iframe
                title="Meeting place map preview"
                src={meetingMapUrl}
                className="h-40 w-full rounded-xl border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-line/60 text-ink-soft">
                <MapIcon className="size-6" />
                <span className="text-sm">Map preview will appear here</span>
              </div>
            )}
            <label className="mt-2 flex flex-col gap-2">
              <FieldLabel>Meeting point name</FieldLabel>
              <input
                name="meetingPointName"
                type="text"
                required
                placeholder="e.g., Main ticket booth by Gate 1"
                aria-label="Meeting place name"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>What&apos;s included</FieldLabel>
            {includedItems.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="includedItems"
                  type="text"
                  required={index === 0}
                  placeholder="e.g., 2 types of traditional tea & refreshments"
                  aria-label="Included item"
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={`Remove included item ${index + 1}`}
                    title="Remove item"
                    onClick={() => removeIncludedItem(key)}
                  />
                ) : null}
              </div>
            ))}
            <button type="button" onClick={addIncludedItem} className={ADD_ROW_BUTTON_CLASS}>
              + Add item
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>Who cannot join</FieldLabel>
            {restrictions.map((key, index) => (
              <div key={key} className="relative">
                <input
                  name="restrictionNotes"
                  type="text"
                  placeholder="e.g., People with mobility difficulties"
                  aria-label="Restriction"
                  className={`${INPUT_CLASS} ${index > 0 ? "pr-12" : ""}`}
                />
                {index > 0 ? (
                  <InlineRemoveButton
                    ariaLabel={`Remove restriction ${index + 1}`}
                    title="Remove restriction"
                    onClick={() => removeRestriction(key)}
                  />
                ) : null}
              </div>
            ))}
            <button type="button" onClick={addRestriction} className={ADD_ROW_BUTTON_CLASS}>
              + Add restriction
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
          {currentStep === 1 ? "Cancel" : "Previous Step"}
        </button>
        <button
          type="button"
          onClick={currentStep === 3 ? handleRegisterClick : goToNextStep}
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream transition-colors enabled:hover:bg-forest-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {currentStep === 3 ? "Register Activity" : "Next Step"}
        </button>
      </BottomActionBar>
      {pendingPublish && (
        <ConfirmDialog
          title="Register this activity?"
          description="You can't edit an activity after publishing."
          confirmLabel="Register"
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
          title="Discard this activity?"
          description="Your changes will be lost."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={() => router.push("/my-activities")}
          onClose={() => setShowDiscardConfirm(false)}
        />
      )}
    </form>
  );
}
