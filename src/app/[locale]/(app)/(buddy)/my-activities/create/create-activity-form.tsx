"use client";
import { ActivityLanguageSelect } from "@/components/activity/ActivityLanguageSelect";
import { activityLanguagesForRequest } from "@/lib/activity-languages";
import {
  ActivityPriceTierEditor,
  ActivityPricingTable,
} from "@/components/buddy/ActivityQuantityPricing";
import { buildPricingRequest, pricingTiers } from "@/lib/activity-pricing";
import { getActivityPricingPreview } from "@/lib/api/activities";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, LogOutIcon } from "@/components/ui/icons";
import { createMyActivity, getMyActivity, updateMyActivity } from "@/lib/api/buddy";
import { createReferralActivity, updateReferralActivity } from "@/lib/api/referral";
import { clearReferralCode, referralActivityPayload } from "@/lib/referral";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getSeoulDateTimeParts, toSeoulStartAt } from "@/lib/datetime";
import { getContentLanguage } from "@/lib/content-language";
import { uploadActivityImageSet } from "@/lib/images/presigned";
import { activityKeys } from "@/lib/query/activities";
import { buddyKeys } from "@/lib/query/buddy";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ActivityUpsertRequest, MyActivityStatus } from "@/types/buddy";
import type { ContentLanguage, ResolvedContentLanguage } from "@/types/content-language";
import {
  ACTIVITY_CREATE_LIMITS,
  ACTIVITY_CREATE_STEPS,
  EMPTY_ACTIVITY_DRAFT,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type DiscountType,
  type ItineraryDraft,
  type PhotoDraft,
  type ScheduleDraft,
  validateActivityCreateStep,
  reorderPhotos,
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
import {
  clearActivityCreateDraft,
  getActivityCreateDraftScope,
  loadActivityCreateDraft,
  saveActivityCreateDraft,
} from "./activity-create-draft-storage";

const MAX_EXPERIENCE_PHOTOS = ACTIVITY_CREATE_LIMITS.photos.max;

const STEP_GROUPS = [
  { key: "intro", steps: ["host", "languages"] },
  { key: "activity", steps: ["name", "description", "photos", "itinerary"] },
  { key: "operation", steps: ["meeting", "schedule", "capacity"] },
  { key: "pricing", steps: ["price", "quantity", "discount"] },
  { key: "policy", steps: ["inclusions", "restrictions"] },
] as const satisfies ReadonlyArray<{
  key: "intro" | "activity" | "operation" | "pricing" | "policy";
  steps: ReadonlyArray<ActivityCreateStep>;
}>;

type DraftScalarField = Exclude<
  keyof ActivityCreateDraft,
  "photos" | "itinerary" | "schedules" | "discountType" | "hasNoRestrictions"
>;

type SubmissionPhase = "uploading" | "registering";

type SubmissionFallbackKey = "imageUploadFailed" | "submissionFailed";

function makeId(prefix: string, sequence: number) {
  return `${prefix}-${Date.now()}-${sequence}`;
}

function createPhotoDraft(file: File, id: string): PhotoDraft {
  return { id, file, previewUrl: URL.createObjectURL(file) };
}

function splitDraftLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function roundMeetingCoordinate(value: number) {
  return Number(value.toFixed(6));
}

export function buildActivityUpsertRequest(
  draft: ActivityCreateDraft,
  imageKeys: string[],
  itineraryImageKeys: string[],
  sourceLanguage: ContentLanguage,
  status: MyActivityStatus = "ACTIVE",
): ActivityUpsertRequest {
  // 화면에서 편집한 일정과, 편집 대상이 아닌 지난 일정을 함께 보낸다.
  // 지난 일정을 빼고 보내면 백엔드가 삭제로 보고 신청 내역이 있을 때 수정이 거절된다.
  const schedules: ActivityUpsertRequest["schedules"] = draft.schedules.map((schedule) => {
    const startAt = toSeoulStartAt(`${schedule.date}T${schedule.startTime}`);
    if (!startAt) throw new Error("Invalid schedule");
    // 원본 초·밀리초를 보존해야 기존 회차와 동일한 instant로 매칭된다.
    const originalParts = schedule.originalStartAt
      ? getSeoulDateTimeParts(schedule.originalStartAt)
      : null;
    return {
      startAt:
        originalParts?.date === schedule.date && originalParts.time === schedule.startTime
          ? schedule.originalStartAt!
          : startAt,
      maxCapacity: Number(schedule.maxCapacity ?? draft.maxGuests),
    };
  });
  for (const startAt of draft.retainedScheduleStartAts) {
    if (!schedules.some((schedule) => Date.parse(schedule.startAt) === Date.parse(startAt)))
      schedules.push({ startAt });
  }

  return {
    sourceLanguage,
    ...activityLanguagesForRequest(draft.availableLanguages),
    title: draft.experienceName.trim(),
    description: draft.experienceDescription.trim(),
    hostIntroduction: draft.hostIntroduction.trim(),
    imageKeys,
    includedItems: splitDraftLines(draft.inclusions),
    restrictionNotes: draft.hasNoRestrictions ? [] : splitDraftLines(draft.restrictions),
    maxCapacity: Number(draft.maxGuests),
    price: Number(draft.pricePerPerson),
    currency: "KRW",
    priceTiers: pricingTiers(draft),
    ...(draft.discountType === "limited"
      ? {
          discountPercent: Number(draft.discountPercent),
          discountEndDate: draft.discountEndsAt,
        }
      : { discountPercent: null, discountEndDate: null }),
    meetingPointName: draft.meetingPlace.trim(),
    meetingPlaceId: draft.meetingPlaceId,
    ...(typeof draft.meetingLatitude === "number" &&
    Number.isFinite(draft.meetingLatitude) &&
    typeof draft.meetingLongitude === "number" &&
    Number.isFinite(draft.meetingLongitude)
      ? {
          meetingLatitude: roundMeetingCoordinate(draft.meetingLatitude),
          meetingLongitude: roundMeetingCoordinate(draft.meetingLongitude),
        }
      : {}),
    status,
    schedules,
    itineraries: draft.itinerary.map((item, index) => ({
      title: item.title.trim(),
      description: item.description.trim(),
      durationMinutes: Number(item.durationMinutes),
      imageKey: itineraryImageKeys[index] ?? "",
    })),
  };
}

function ProgressRail({
  steps,
  groups,
  currentStep,
  furthestStepIndex,
  reviewing,
  getTitle,
  getGroupTitle,
  isStepComplete,
  label,
  onNavigate,
}: Readonly<{
  steps: readonly ActivityCreateStep[];
  groups: readonly {
    key: (typeof STEP_GROUPS)[number]["key"];
    steps: readonly ActivityCreateStep[];
  }[];
  currentStep: ActivityCreateStep;
  furthestStepIndex: number;
  reviewing: boolean;
  getTitle: (step: ActivityCreateStep) => string;
  getGroupTitle: (group: (typeof STEP_GROUPS)[number]["key"]) => string;
  isStepComplete: (step: ActivityCreateStep) => boolean;
  label: string;
  onNavigate: (step: ActivityCreateStep) => void;
}>) {
  const getStepIndex = (step: ActivityCreateStep) => steps.indexOf(step);
  const currentIndex = getStepIndex(currentStep);
  const currentGroupIndex = groups.findIndex((group) =>
    group.steps.some((step) => step === currentStep),
  );
  const isVisitedAndComplete = (step: ActivityCreateStep) =>
    (reviewing || getStepIndex(step) <= furthestStepIndex) && isStepComplete(step);
  const canNavigateForwardTo = (step: ActivityCreateStep) => {
    const targetIndex = getStepIndex(step);
    if (reviewing || targetIndex <= currentIndex) return true;
    if (targetIndex > furthestStepIndex) return false;
    return steps.slice(0, targetIndex).every(isStepComplete);
  };

  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-primary/15 bg-[#fff] px-7 py-9 lg:block">
      <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
        {currentIndex + 1} / {steps.length}
      </p>
      <ol className="mt-7 space-y-3" aria-label={label}>
        {groups.map((group, index) => {
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

export interface CreateActivityFormProps {
  referral?: boolean;
  invitationCode?: string;
  mode?: "create" | "edit";
  /** edit 모드에서 수정할 활동 id (라우트 파라미터 그대로) */
  activityId?: string;
  /** edit 모드에서 기존 활동으로 채운 초기 draft */
  initialDraft?: ActivityCreateDraft;
  /** Live occupancy only; never replaces user-edited dates or capacities. */
  latestSchedules?: readonly ScheduleDraft[];
  /** edit 모드에서 유지할 기존 활동 상태 */
  initialStatus?: MyActivityStatus;
  /** edit 모드에서 기존 활동 원문의 언어를 유지한다 */
  initialSourceLanguage?: ResolvedContentLanguage;
}

export function CreateActivityForm({
  referral = false,
  invitationCode,
  mode = "create",
  activityId,
  initialDraft,
  latestSchedules,
  initialStatus,
  initialSourceLanguage,
}: Readonly<CreateActivityFormProps> = {}) {
  const t = useTranslations("CreateActivity");
  const tReferral = useTranslations("Referral");
  const pricingT = useTranslations("QuantityPricing");
  const currentLanguage = getContentLanguage(useLocale());
  const sourceLanguage =
    initialSourceLanguage && initialSourceLanguage !== "UNKNOWN"
      ? initialSourceLanguage
      : currentLanguage;
  const router = useRouter();
  const queryClient = useQueryClient();
  const getApiErrorMessage = useApiErrorMessage();
  const isEdit = mode === "edit";
  const steps = ACTIVITY_CREATE_STEPS.filter(
    (step) => !referral || (step !== "discount" && step !== "quantity"),
  );
  const groups = STEP_GROUPS.map((group) => ({
    ...group,
    steps: group.steps.filter((step) => !referral || (step !== "discount" && step !== "quantity")),
  }));
  const getStepIndex = (step: ActivityCreateStep) => steps.indexOf(step);
  const persistenceScope = `${referral ? "referral:" : ""}${getActivityCreateDraftScope(mode, activityId)}`;
  const [currentStep, setCurrentStep] = useState<ActivityCreateStep>("host");
  const [furthestStepIndex, setFurthestStepIndex] = useState(isEdit ? steps.length - 1 : 0);
  const [editableDraft, setDraft] = useState<ActivityCreateDraft>(
    initialDraft ?? EMPTY_ACTIVITY_DRAFT,
  );
  // Server occupancy stays fresh; only user-editable fields belong to the local draft.
  const draft = useMemo(() => {
    if (!isEdit || !latestSchedules) return editableDraft;
    const occupancyById = new Map(latestSchedules.map((schedule) => [schedule.id, schedule]));
    return {
      ...editableDraft,
      schedules: editableDraft.schedules.map((schedule) => {
        const latest = occupancyById.get(schedule.id);
        return latest
          ? {
              ...schedule,
              bookedCount: latest.bookedCount,
              heldSeats: latest.heldSeats,
              remainingCapacity: latest.remainingCapacity,
            }
          : schedule;
      }),
    };
  }, [editableDraft, latestSchedules, isEdit]);
  const [errorKey, setErrorKey] = useState<ActivityCreateErrorKey | null>(null);
  const [reviewing, setReviewing] = useState(isEdit);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase | null>(null);
  const submissionInFlight = useRef(false);
  const [submissionError, setSubmissionError] = useState<{
    error: unknown;
    fallbackKey: SubmissionFallbackKey;
  } | null>(null);
  const fileSequence = useRef(0);
  const scheduleSequence = useRef(0);
  const objectUrls = useRef(new Set<string>());
  const draftWasDiscarded = useRef(false);
  const [isDraftPersistenceReady, setIsDraftPersistenceReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentIndex = getStepIndex(currentStep);
  const progressIndex = reviewing ? steps.length : currentIndex + 1;
  const isSubmitting = submissionPhase !== null;
  const submitActivityMutation = useMutation({
    mutationFn: async (request: ActivityUpsertRequest) => {
      if (referral) {
        const body = referralActivityPayload(request);
        if (isEdit && activityId)
          return unwrapApiResult(await updateReferralActivity(activityId, body), "data");
        if (!invitationCode) throw new Error("Missing invitation");
        return unwrapApiResult(await createReferralActivity(invitationCode, body), "data");
      }
      if (isEdit && activityId !== undefined) {
        return unwrapApiResult(await updateMyActivity(activityId, request), "activity");
      }
      return unwrapApiResult(await createMyActivity(request), "activity");
    },
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: buddyKeys.myActivities() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.scheduleDates() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ];
      if (isEdit && activityId !== undefined) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: buddyKeys.activityDetail(activityId) }),
        );
      }
      await Promise.all(invalidations);
    },
  });
  useAuthQueryRedirect(
    (submissionError?.error instanceof Error ? submissionError.error : null) ??
      submitActivityMutation.error,
  );

  useEffect(() => {
    const urls = objectUrls.current;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadActivityCreateDraft(persistenceScope).then((restored) => {
      if (cancelled) {
        restored?.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      if (restored) {
        setCurrentStep(restored.snapshot.currentStep);
        setFurthestStepIndex(restored.snapshot.furthestStepIndex);
        setDraft(restored.snapshot.draft);
        setErrorKey(restored.snapshot.errorKey);
        setReviewing(restored.snapshot.reviewing);
        fileSequence.current = restored.snapshot.fileSequence;
        scheduleSequence.current = restored.snapshot.scheduleSequence;
        restored.objectUrls.forEach((url) => objectUrls.current.add(url));
      }
      setIsDraftPersistenceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [persistenceScope]);

  useEffect(() => {
    if (!isDraftPersistenceReady || draftWasDiscarded.current) return;

    const timeoutId = window.setTimeout(() => {
      if (draftWasDiscarded.current) return;
      void saveActivityCreateDraft(persistenceScope, {
        currentStep,
        furthestStepIndex,
        draft,
        errorKey,
        reviewing,
        fileSequence: fileSequence.current,
        scheduleSequence: scheduleSequence.current,
      }).catch(() => undefined);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentStep,
    draft,
    errorKey,
    furthestStepIndex,
    isDraftPersistenceReady,
    persistenceScope,
    reviewing,
  ]);

  const clearPreservedDraft = useCallback(() => {
    draftWasDiscarded.current = true;
    void clearActivityCreateDraft(persistenceScope).catch(() => undefined);
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, [persistenceScope]);

  useEffect(() => {
    window.addEventListener("popstate", clearPreservedDraft);
    return () => window.removeEventListener("popstate", clearPreservedDraft);
  }, [clearPreservedDraft]);

  function updateField<Field extends DraftScalarField>(
    field: Field,
    value: ActivityCreateDraft[Field],
  ) {
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

  function updateAllScheduleCapacities(maxGuests: string) {
    setDraft((current) => ({
      ...current,
      maxGuests,
      schedules: current.schedules.map((schedule) => ({ ...schedule, maxCapacity: maxGuests })),
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
    const uniqueStartTimes = [...new Set(startTimes.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );

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

  async function submitActivity() {
    if (submissionInFlight.current) return;
    // 새 시도를 시작하므로 지난 제출 오류부터 비운다 — 검증에 걸려 되돌아갈 때 두 오류가 겹치지 않게
    setSubmissionError(null);

    // 제출 직전 전체 단계를 한 번 더 검증해 리뷰 중 유실된 값이 있으면 해당 단계로 되돌린다
    const invalidStep = steps.find(
      (step) => validateActivityCreateStep(step, draft, referral, isEdit) !== null,
    );
    if (invalidStep) {
      setReviewing(false);
      setCurrentStep(invalidStep);
      setErrorKey(validateActivityCreateStep(invalidStep, draft, referral, isEdit));
      scrollToTop();
      return;
    }

    submissionInFlight.current = true;
    setSubmissionPhase("uploading");
    let submissionSucceeded = false;
    try {
      if (!referral) {
        const pricing = buildPricingRequest(draft);
        if (!pricing) throw new Error(t("errors.pricingInvalid"));
        // Recheck with the current authenticated buddy's rate before saving, even from another step.
        unwrapApiResult(await getActivityPricingPreview(pricing), "preview");
      }
      // 기존 이미지는 발급받았던 key를 그대로 쓰고, 새로 고른 파일만 업로드한다
      const newGalleryFiles = draft.photos
        .map((photo) => photo.file)
        .filter((file): file is File => file !== null);
      const newItineraryFiles = draft.itinerary
        .map((item) => item.photo?.file)
        .filter((file): file is File => Boolean(file));
      const filesToUpload = [...newGalleryFiles, ...newItineraryFiles];

      let uploadedKeys: string[] = [];
      if (filesToUpload.length > 0) {
        try {
          const uploadedImages = await uploadActivityImageSet(filesToUpload);
          uploadedKeys = uploadedImages.map((image) => image.imageKey);
        } catch (error) {
          if (error instanceof UnauthenticatedQueryError) throw error;
          setSubmissionError({ error, fallbackKey: "imageUploadFailed" });
          return;
        }
      }

      let uploadIndex = 0;
      const imageKeys = draft.photos.map((photo) => {
        if (photo.existingKey) return photo.existingKey;
        if (photo.file) return uploadedKeys[uploadIndex++] ?? "";
        return "";
      });
      const itineraryImageKeys = draft.itinerary.map((item) => {
        if (item.photo?.existingKey) return item.photo.existingKey;
        if (item.photo?.file) return uploadedKeys[uploadIndex++] ?? "";
        return "";
      });

      setSubmissionPhase("registering");
      await submitActivityMutation.mutateAsync(
        buildActivityUpsertRequest(
          draft,
          imageKeys,
          itineraryImageKeys,
          sourceLanguage,
          initialStatus ?? "ACTIVE",
        ),
      );
      submissionSucceeded = true;
      if (referral && !isEdit) clearReferralCode();
      clearPreservedDraft();
      router.push(
        isEdit && activityId !== undefined ? `/my-activities/${activityId}` : "/my-activities",
      );
    } catch (error) {
      setSubmissionError({ error, fallbackKey: "submissionFailed" });
      if (
        isEdit &&
        activityId !== undefined &&
        error instanceof ApiClientError &&
        error.code?.startsWith("ACTIVITY_SCHEDULE")
      ) {
        try {
          // A failed background refresh must not turn the parent edit query into an error.
          const latest = unwrapApiResult(await getMyActivity(activityId), "activity");
          queryClient.setQueryData(buddyKeys.activityDetail(activityId), latest);
          // Refresh occupancy without discarding the user's form, images, times or capacities.
          setDraft((current) => ({
            ...current,
            schedules: current.schedules.map((schedule) => {
              const updated = latest.schedules.find(
                (item) => `existing-schedule-${item.scheduleId}` === schedule.id,
              );
              return updated
                ? {
                    ...schedule,
                    bookedCount: updated.bookedCount,
                    heldSeats: updated.heldSeats ?? 0,
                    remainingCapacity: updated.remainingCapacity,
                  }
                : schedule;
            }),
          }));
        } catch {
          // The original validation error and input remain available if refresh also fails.
        }
      }
    } finally {
      // router.push returns before unmount. Keep successful saves locked during navigation.
      if (!submissionSucceeded) {
        submissionInFlight.current = false;
        setSubmissionPhase(null);
      }
    }
  }

  function goNext() {
    if (isSubmitting) return;
    if (reviewing) {
      void submitActivity();
      return;
    }

    const validationError = validateActivityCreateStep(currentStep, draft, referral, isEdit);
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

    const nextStep = steps[Math.min(steps.length - 1, currentIndex + 1)];
    setFurthestStepIndex((furthest) => Math.max(furthest, getStepIndex(nextStep)));
    setCurrentStep(nextStep);
    setErrorKey(null);
    scrollToTop();
  }

  function goBack() {
    if (isSubmitting) return;
    if (reviewing) {
      setReviewing(false);
      setSubmissionError(null);
      scrollToTop();
      return;
    }
    if (currentIndex === 0) return;
    setCurrentStep(steps[Math.max(0, currentIndex - 1)]);
    setErrorKey(null);
    scrollToTop();
  }

  function navigateToStep(step: ActivityCreateStep) {
    if (isSubmitting) return;
    const targetIndex = getStepIndex(step);
    if (!reviewing && targetIndex > currentIndex) {
      const priorStepsAreComplete = steps
        .slice(0, targetIndex)
        .every(
          (priorStep) => validateActivityCreateStep(priorStep, draft, referral, isEdit) === null,
        );
      if (targetIndex > furthestStepIndex || !priorStepsAreComplete) return;
    }
    setCurrentStep(step);
    setReviewing(false);
    setSubmissionError(null);
    setErrorKey(null);
    scrollToTop();
  }

  function getStepTitle(step: ActivityCreateStep) {
    if (step === "languages") return t("languageStep.title");
    if (referral && step === "price") return t("price.referralTitle");
    return t(`steps.${step}.title`);
  }

  function renderStep() {
    if (reviewing)
      return <ReviewStep draft={draft} activityId={activityId} t={t} referral={referral} />;

    switch (currentStep) {
      case "host":
        return <HostStep draft={draft} onChange={updateField} t={t} />;
      case "languages":
        return (
          <ActivityLanguageSelect
            value={draft.availableLanguages ?? []}
            disabled={isSubmitting}
            onChange={(availableLanguages) => {
              setDraft((current) => ({
                ...current,
                availableLanguages,
                availableLanguagesTouched: true,
              }));
              setErrorKey(null);
            }}
          />
        );
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
            onReorder={(id, targetId) =>
              setDraft((current) => ({
                ...current,
                photos: reorderPhotos(current.photos, id, targetId),
              }))
            }
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
            t={t}
          />
        );
      case "capacity":
        return (
          <CapacityStep
            value={draft.maxGuests}
            onChange={updateAllScheduleCapacities}
            schedules={draft.schedules}
            onScheduleCapacityChange={(id, maxCapacity) =>
              setDraft((current) => ({
                ...current,
                schedules: current.schedules.map((schedule) =>
                  schedule.id === id ? { ...schedule, maxCapacity } : schedule,
                ),
              }))
            }
            t={t}
          />
        );
      case "price":
        return (
          <>
            <PriceStep
              value={draft.pricePerPerson}
              priceTiers={draft.quantityPricingEnabled ? draft.priceTiers : []}
              referral={referral}
              onChange={(value) => updateField("pricePerPerson", value)}
              t={t}
            />
          </>
        );
      case "quantity":
        return (
          <ActivityPriceTierEditor
            draft={draft}
            onChange={(quantityPricingEnabled, priceTiers) => {
              setDraft((current) => ({ ...current, quantityPricingEnabled, priceTiers }));
              setErrorKey(null);
            }}
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
          <>
            <DiscountStep
              type={draft.discountType}
              percent={draft.discountPercent}
              endsAt={draft.discountEndsAt}
              onTypeChange={updateDiscountType}
              onPercentChange={(value) => updateField("discountPercent", value)}
              onEndsAtChange={(value) => updateField("discountEndsAt", value)}
              t={t}
            />
            {!referral && draft.discountType === "limited" && (
              <ActivityPricingTable draft={draft} />
            )}
          </>
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
  const description = reviewing
    ? t("review.description")
    : currentStep === "languages"
      ? t("languageStep.description")
      : referral && currentStep === "price"
        ? t("price.referralDescription")
        : t(`steps.${currentStep}.description`);
  const isLongStep =
    reviewing ||
    currentStep === "photos" ||
    currentStep === "itinerary" ||
    currentStep === "schedule";
  const currentGroup =
    groups.find((group) => group.steps.some((step) => step === currentStep)) ?? groups[0];
  const exitHref =
    isEdit && activityId !== undefined ? `/my-activities/${activityId}` : "/dashboard";
  let phaseLabel: string | null = null;
  if (submissionPhase === "uploading") phaseLabel = t("actions.submitUploading");
  if (submissionPhase === "registering") {
    phaseLabel = t(isEdit ? "actions.submitSaving" : "actions.submitRegistering");
  }

  let primaryActionLabel = reviewing
    ? t(isEdit ? "actions.save" : "actions.finish")
    : t("actions.next");
  if (reviewing && phaseLabel) primaryActionLabel = phaseLabel;
  // 수정 모드에는 단계마다 저장 버튼이 있어 진행 문구는 그쪽에 싣는다
  const stepSaveLabel = phaseLabel ?? t("actions.save");

  return (
    <div className="fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-[#fff] text-ink">
      <header className="z-20 shrink-0 border-b border-primary/15 bg-[#fff] px-4 py-2 lg:px-8 lg:py-3.5">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={36}
              height={36}
              className="size-7 shrink-0 object-contain lg:size-9"
              priority
            />
            <span className="truncate font-display text-base font-extrabold tracking-[-0.04em] text-ink lg:text-lg">
              HanBuddy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={exitHref}
              onNavigate={clearPreservedDraft}
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
          style={{ width: `${(progressIndex / steps.length) * 100}%` }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <ProgressRail
          steps={steps}
          groups={groups}
          currentStep={currentStep}
          furthestStepIndex={furthestStepIndex}
          reviewing={reviewing}
          getTitle={getStepTitle}
          getGroupTitle={(group) => t(`groups.${group}`)}
          isStepComplete={(step) =>
            validateActivityCreateStep(step, draft, referral, isEdit) === null
          }
          label={t("progressLabel")}
          onNavigate={navigateToStep}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            ref={contentRef}
            className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div
              className={`mx-auto flex min-h-full w-full flex-col px-4 py-4 sm:px-6 lg:px-12 lg:py-12 ${
                reviewing ? "max-w-7xl" : "max-w-4xl"
              } ${isLongStep ? "justify-start" : "justify-center"}`}
            >
              <div className={`mx-auto w-full ${reviewing ? "max-w-6xl" : "max-w-3xl"}`}>
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isSubmitting || (!reviewing && currentIndex === 0)}
                  aria-label={t("actions.back")}
                  className="mb-4 hidden size-11 items-center justify-center rounded-full text-primary-strong transition hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:invisible lg:flex"
                >
                  <ArrowLeftIcon className="size-5" />
                </button>
                <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase lg:hidden">
                  {t(`groups.${currentGroup.key}`)} ·
                  {currentGroup.steps.findIndex((step) => step === currentStep) + 1}/
                  {currentGroup.steps.length}
                </p>
                <h1
                  aria-live="polite"
                  className="mt-2 font-display text-xl leading-snug font-bold tracking-tight break-keep text-ink lg:text-3xl"
                >
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-5 text-muted lg:mt-3 lg:text-base lg:leading-7">
                  {description}
                </p>
                <div className="mt-4 lg:mt-10">{renderStep()}</div>
                {errorKey ? (
                  <p
                    role="alert"
                    className="mt-6 rounded-xl border border-primary/20 bg-primary-soft/55 px-4 py-3 text-sm font-semibold text-primary-strong"
                  >
                    {t(`errors.${errorKey}`)}
                  </p>
                ) : null}
                {submissionError ? (
                  <p
                    role="alert"
                    className="mt-6 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
                  >
                    {submissionError.error instanceof ApiClientError &&
                    submissionError.error.code === "PAYMENT400_AMOUNT"
                      ? pricingT("invalidAmount")
                      : getApiErrorMessage(
                          submissionError.error,
                          t(`errors.${submissionError.fallbackKey}`),
                        )}
                  </p>
                ) : null}
                {referral && !isEdit && submissionError ? (
                  <div className="mt-3 text-sm leading-6 text-muted">
                    <p>{tReferral("checkActivities")}</p>
                    <Link href="/my-activities" className="text-primary underline">
                      {tReferral("myActivities")}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </main>

          <footer className="z-20 shrink-0 border-t border-primary/15 bg-[#fff] px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:px-8 lg:pt-3.5 lg:pb-3.5">
            <div
              className={`mx-auto grid grid-cols-2 items-center gap-3 lg:flex lg:justify-end lg:px-12 ${
                reviewing ? "max-w-7xl" : "max-w-4xl"
              }`}
            >
              <p aria-live="polite" className="sr-only">
                {isSubmitting ? (phaseLabel ?? primaryActionLabel) : ""}
              </p>
              <button
                type="button"
                onClick={goBack}
                disabled={isSubmitting || (!reviewing && currentIndex === 0)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4 text-sm font-bold text-ink transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary enabled:hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40 lg:hidden"
              >
                {t("actions.back")}
              </button>
              {isEdit && !reviewing ? (
                // 마지막 화면까지 가지 않아도 지금까지의 변경을 바로 저장한다.
                // 저장 전에 전체 단계를 검증하므로, 비어 있는 단계가 있으면 그리로 데려간다
                <button
                  type="button"
                  onClick={() => void submitActivity()}
                  disabled={isSubmitting}
                  className="order-first col-span-2 flex min-h-11 items-center justify-center rounded-full border border-primary px-6 text-sm font-bold text-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary enabled:hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60 lg:order-none"
                >
                  {stepSaveLabel}
                </button>
              ) : null}
              <button
                key={reviewing ? "review" : currentStep}
                type="button"
                onClick={(event) => {
                  if (event.detail <= 1) goNext();
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && event.repeat)
                    event.preventDefault();
                }}
                disabled={isSubmitting}
                className="flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-[0_8px_18px_rgba(209,63,50,0.18)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary enabled:hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-32"
              >
                {primaryActionLabel}
                {isSubmitting ? null : <ArrowRightIcon className="size-4" />}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
