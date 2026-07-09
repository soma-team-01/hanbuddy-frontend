"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagePlusIcon, MapIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
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
  const dates = formData
    .getAll("activityDate")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  const times = formData
    .getAll("startTime")
    .map((value) => (typeof value === "string" ? value.trim() : ""));

  return dates
    .map((activityDate, index) => ({
      activityDate,
      startTime: times[index] ?? "",
    }))
    .filter((schedule) => schedule.activityDate && schedule.startTime);
}

export function CreateActivityForm() {
  const router = useRouter();
  const [includedItems, setIncludedItems] = useState<number[]>([0]);
  const [timeSlots, setTimeSlots] = useState<number[]>([0]);
  const [restrictions, setRestrictions] = useState<number[]>([0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    const apiKey = getGoogleMapsApiKey();
    const query = meetingPlaceQuery.trim();
    if (query.length < 3 || !apiKey || query === selectedMeetingPlaceLabel) {
      return;
    }

    let isMounted = true;

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

    return () => {
      isMounted = false;
    };
  }, [meetingPlaceQuery, selectedMeetingPlaceLabel]);

  function handleBack() {
    // 제출 진행 중 이탈하면 업로드/등록이 백그라운드에서 계속돼 폐기했다고 착각할 수 있으므로 무시한다
    if (submittingStatus !== null) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    router.push("/my-activities");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status: MyActivityStatus = submitter?.value === "DRAFT" ? "DRAFT" : "ACTIVE";
    const formData = new FormData(event.currentTarget);

    setErrorMessage("");
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select at least one activity photo.");
      return;
    }
    if (!getString(formData, "meetingPlaceId")) {
      setErrorMessage("Please select a Google place from the results.");
      return;
    }

    if (status === "ACTIVE") {
      setPendingPublish(formData);
      return;
    }
    await submitActivity(status, formData);
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
        meetingPointAddress: GOOGLE_PLACE_COMPAT_ADDRESS,
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the activity.");
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

  const isSubmitting = submittingStatus !== null;
  const meetingMapUrl = meetingPlaceId
    ? buildGoogleMapsEmbedUrl(meetingPlaceId, getGoogleMapsApiKey())
    : "";

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setIsDirty(true)}
      className="flex flex-1 flex-col pb-28"
    >
      <TopAppBar onLeftClick={handleBack} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-8">
        <div>
          <p className="font-display text-xs font-semibold tracking-widest text-earth uppercase">
            Step 1 of 3
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-forest">Activity Basics</h1>
          <p className="mt-2 text-ink-soft">
            Start by providing the fundamental details of your cultural experience.
          </p>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </p>
        ) : null}

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-white/60 px-6 py-14 text-ink-soft">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="Activity photos"
            className="sr-only"
            onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))}
          />
          <ImagePlusIcon className="size-8" />
          <span className="font-display text-sm font-semibold text-ink">
            Click to upload cover photo
          </span>
          <span className="text-xs">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} selected`
              : "PNG, JPG, WebP up to 8 files"}
          </span>
        </label>

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

        <div className="flex flex-col gap-2">
          <FieldLabel>What&apos;s included</FieldLabel>
          {includedItems.map((key) => (
            <input
              key={key}
              name="includedItems"
              type="text"
              required={key === 0}
              placeholder="e.g., 2 types of traditional tea & refreshments"
              aria-label="Included item"
              className={INPUT_CLASS}
            />
          ))}
          <button
            type="button"
            onClick={() => setIncludedItems((items) => [...items, items.length])}
            className="self-start text-sm font-semibold text-earth"
          >
            + Add item
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Availability</FieldLabel>
          {timeSlots.map((key) => (
            <div key={key} className="grid grid-cols-2 gap-3">
              <input
                name="activityDate"
                type="date"
                required={key === 0}
                aria-label="Available date"
                className={INPUT_CLASS}
              />
              <input
                name="startTime"
                type="time"
                required={key === 0}
                aria-label="Available time"
                className={INPUT_CLASS}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTimeSlots((slots) => [...slots, slots.length])}
            className="self-start text-sm font-semibold text-earth"
          >
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

        <div className="flex flex-col gap-2">
          <FieldLabel>Meeting Point</FieldLabel>
          <label className="flex flex-col gap-2">
            <FieldLabel>Search Google place</FieldLabel>
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
            <div
              role="listbox"
              aria-label="Google place results"
              className="overflow-hidden rounded-xl border border-line bg-white"
            >
              {placePredictions.map((prediction) => (
                <button
                  key={prediction.placeId}
                  type="button"
                  role="option"
                  aria-selected={prediction.placeId === meetingPlaceId}
                  onClick={() => handlePlaceSelect(prediction)}
                  className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-chip"
                >
                  <span className="text-sm font-semibold text-ink">{prediction.mainText}</span>
                  {prediction.secondaryText ? (
                    <span className="text-xs text-ink-soft">{prediction.secondaryText}</span>
                  ) : null}
                </button>
              ))}
            </div>
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
          <FieldLabel>Who cannot join</FieldLabel>
          {restrictions.map((key) => (
            <input
              key={key}
              name="restrictionNotes"
              type="text"
              placeholder="e.g., People with mobility difficulties"
              aria-label="Restriction"
              className={INPUT_CLASS}
            />
          ))}
          <button
            type="button"
            onClick={() => setRestrictions((items) => [...items, items.length])}
            className="self-start text-sm font-semibold text-earth"
          >
            + Add restriction
          </button>
        </div>
      </main>
      <BottomActionBar>
        <button
          type="submit"
          name="status"
          value="DRAFT"
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl border border-line bg-chip font-display text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Draft
        </button>
        <button
          type="submit"
          name="status"
          value="ACTIVE"
          disabled={isSubmitting}
          className="h-12 flex-1 rounded-xl bg-forest font-display text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-60"
        >
          Publish Activity
        </button>
      </BottomActionBar>
      {pendingPublish && (
        <ConfirmDialog
          title="Publish this activity?"
          description="You can't edit an activity after publishing."
          confirmLabel="Publish"
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
