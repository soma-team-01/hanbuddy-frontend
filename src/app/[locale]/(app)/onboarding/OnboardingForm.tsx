"use client";

import { invalidateAnalyticsAccount } from "@/lib/analytics/cookie-runtime";
import { useMeasurementEvents } from "@/components/analytics/AnalyticsProvider";
import { SignupExtraFields } from "./SignupExtraFields";
import {
  buildSignupExtra,
  isBankName,
  validateSignupSource,
  validateSignupBank,
  type SignupExtraDraft,
  type SignupExtraError,
} from "@/lib/auth/signup-extra";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChangeEvent, FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SignupAgreementNoticeDialog } from "@/components/auth/SignupAgreementNoticeDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  APP_BY_CONTACT_METHOD,
  CONTACT_METHOD_BY_APP,
  MAX_MESSENGER_ID_LENGTH,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { createApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import {
  buildSignupAgreements,
  getRequiredSignupAgreementTypes,
  getSignupAgreementTypes,
  hasAllRequiredSignupAgreements,
} from "@/lib/auth/signup-agreements";
import type { SignupAgreementDocuments } from "@/lib/auth/signup-agreement-notices";
import { COUNTRIES, findCountry } from "@/lib/countries";
import { DISPLAY_NAME_PATTERN, isValidDisplayName } from "@/lib/display-name";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_CONTENT_TYPES,
  isSupportedProfileImageType,
  uploadProfileImage,
} from "@/lib/images/presigned";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";
import type messages from "@/messages/en.json";
import type {
  ApiResponse,
  BuddyResubmission,
  BuddyResubmissionRequest,
  ErrorApiResponse,
  GoogleLoginResponse,
  GoogleProfile,
  GoogleSignupRequest,
  SignupAgreementType,
  UserType,
} from "@/lib/auth/types";
import {
  clearExpiredOnboardingDrafts,
  clearOnboardingDraft,
  clearSignupOnboardingDrafts,
  getOnboardingDraftScope,
  getOnboardingMemoryDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "./onboarding-draft-storage";

import { BirthDatePicker } from "./BirthDatePicker";
import { ONBOARDING_SELECT_TRIGGER } from "@/app/[locale]/(app)/onboarding/onboarding-field-styles";
import { isValidBirthDate } from "./birth-date";
import mobileStyles from "./onboarding-mobile.module.css";

type OnboardingValidationErrorKey = keyof (typeof messages)["Onboarding"]["validation"];
type OnboardingErrorKey =
  | `validation.${OnboardingValidationErrorKey}`
  | "profileUploadFailed"
  | "signupFailed"
  | "serverUnavailable";
type RequestFailureKey =
  "profileUploadFailed" | "resubmissionFailed" | "signupFailed" | "serverUnavailable";

interface OnboardingFormProps {
  googleProfile?: GoogleProfile;
  signupDraftAccountId?: string;
  userType?: UserType;
  resubmission?: BuddyResubmission;
  agreementDocuments?: SignupAgreementDocuments;
}

type OnboardingStep = 1 | 2 | 3;

const MINIMUM_SIGNUP_AGE = 19;
const MAXIMUM_SIGNUP_AGE = 120;
const COUNTRY_CALLING_CODE_PATTERN = /^\+\d{1,4}$/;
const PHONE_CONTACT_PATTERN = /^\d{6,15}$/;
const MESSENGER_CONTACT_PATTERN = /^[A-Za-z0-9@._+\-]{2,100}$/;

function getLocalDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function subscribeToLocalDate() {
  return () => undefined;
}

function getCurrentLocalDateInputValue() {
  return getLocalDateInputValue(new Date());
}

function getServerLocalDateInputValue() {
  return "";
}

function subtractYearsFromDateInput(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetYear = year - years;
  const maxDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();

  return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}

function isValidDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function getInitialMessagingCountry(nationalityCode: string, contactCountryCode?: string | null) {
  if (!contactCountryCode) return nationalityCode || "US";
  const nationality = findCountry(nationalityCode);
  if (nationality?.dialCode === contactCountryCode) return nationality.code;
  return COUNTRIES.find((country) => country.dialCode === contactCountryCode)?.code ?? "US";
}

function getInitialMessagingApp(
  isBuddyFlow: boolean,
  resubmission: BuddyResubmission | undefined,
): MessagingAppKey {
  if (isBuddyFlow) return "phone";
  if (resubmission) return APP_BY_CONTACT_METHOD[resubmission.contactMethod];
  return "kakaotalk";
}

function getOnboardingBackHref(isResubmission: boolean, isBuddyFlow: boolean) {
  if (isResubmission) return "/buddy/auth/status?status=REJECTED" as const;
  if (isBuddyFlow) return "/buddy" as const;
  return "/login" as const;
}

export function OnboardingForm({
  googleProfile,
  signupDraftAccountId,
  userType = "TOURIST",
  resubmission,
  agreementDocuments,
}: Readonly<OnboardingFormProps>) {
  const t = useTranslations("Onboarding");
  const buddyT = useTranslations("BuddyOnboarding");
  const resubmissionT = useTranslations("BuddyResubmission");
  const messagingT = useTranslations("Messaging");
  const accessibilityT = useTranslations("Accessibility");
  const getApiErrorMessage = useApiErrorMessage();
  const router = useRouter();
  const { trackSignup } = useMeasurementEvents();
  const isResubmission = Boolean(resubmission);
  const isBuddyFlow = userType === "BUDDY";
  // Signup-only fields deliberately stay out of persistent onboarding drafts.
  const [signupExtra, setSignupExtra] = useState<SignupExtraDraft>({
    signupSource: "",
    signupSourceDetail: "",
    bankName: resubmission?.bankAccount?.bank ?? "",
    bankAccountNumber: resubmission?.bankAccount?.accountNumber ?? "",
  });
  const [signupExtraError, setSignupExtraError] = useState<SignupExtraError | null>(null);
  const finalStep: OnboardingStep = isResubmission ? 2 : 3;
  const draftScope = getOnboardingDraftScope({
    userType,
    signupDraftAccountId,
    resubmissionUserId: resubmission?.userId,
    reviewedAt: resubmission?.reviewedAt,
  });
  const [initialDraft] = useState(() => (draftScope ? getOnboardingMemoryDraft(draftScope) : null));
  const initialStep = Math.min(initialDraft?.currentStep ?? 1, finalStep) as OnboardingStep;
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [displayName, setDisplayName] = useState(
    initialDraft?.displayName ?? resubmission?.displayName ?? googleProfile?.name ?? "",
  );
  const [birthDate, setBirthDate] = useState(
    initialDraft?.birthDate ?? resubmission?.birthDate ?? "",
  );
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>(
    () => initialDraft?.messagingApp ?? getInitialMessagingApp(isBuddyFlow, resubmission),
  );
  const [messagingContact, setMessagingContact] = useState(
    initialDraft?.messagingContact ??
      (resubmission && (!isBuddyFlow || resubmission.contactMethod === "PHONE")
        ? resubmission.contactIdentifier
        : ""),
  );
  const [agreementDecisions, setAgreementDecisions] = useState<
    Partial<Record<SignupAgreementType, boolean>>
  >(initialDraft?.agreementDecisions ?? {});
  const [openAgreementType, setOpenAgreementType] = useState<SignupAgreementType | null>(null);
  const [errorKey, setErrorKey] = useState<OnboardingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: RequestFailureKey;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const currentLocalDate = useSyncExternalStore(
    subscribeToLocalDate,
    getCurrentLocalDateInputValue,
    getServerLocalDateInputValue,
  );
  const oldestAllowedBirthDate = currentLocalDate
    ? subtractYearsFromDateInput(currentLocalDate, MAXIMUM_SIGNUP_AGE)
    : "";
  const youngestAllowedBirthDate = currentLocalDate
    ? subtractYearsFromDateInput(currentLocalDate, MINIMUM_SIGNUP_AGE)
    : "";
  const [profileImageFile, setProfileImageFile] = useState<File | null>(
    initialDraft?.profileImageFile ?? null,
  );
  const [profileImagePreview, setProfileImagePreview] = useState(() =>
    initialDraft?.profileImageFile ? URL.createObjectURL(initialDraft.profileImageFile) : "",
  );
  const [existingProfileImageKey, setExistingProfileImageKey] = useState<string | null>(
    initialDraft?.existingProfileImageKey ?? resubmission?.profileImageKey ?? null,
  );
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState<string | null>(
    initialDraft?.existingProfileImageUrl ?? resubmission?.profileImageUrl ?? null,
  );
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  // 같은 파일로 재제출할 때(회원가입 요청만 실패한 경우) S3 업로드를 반복하지 않기 위한 캐시
  const uploadedProfileImageRef = useRef<{ file: File; imageKey: string } | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const agreementTriggerRef = useRef<HTMLButtonElement>(null);
  const draftPersistenceDisabledRef = useRef(false);
  const [isDraftPersistenceReady, setIsDraftPersistenceReady] = useState(initialDraft !== null);
  const initialNationality = initialDraft?.nationality ?? resubmission?.nationalityCode ?? "";
  const initialMessagingCountry = getInitialMessagingCountry(
    initialNationality,
    initialDraft?.messagingCountry ?? resubmission?.contactCountryCode,
  );
  const {
    nationality,
    messagingCountry,
    handleNationalityChange,
    handleMessagingCountryChange,
    restoreMessagingCountries,
  } = useMessagingCountrySync(initialNationality, initialMessagingCountry);
  const agreementTypes = getSignupAgreementTypes(userType);
  const requiredAgreementTypes = getRequiredSignupAgreementTypes(userType);
  const allAgreementsSelected = agreementTypes.every(
    (agreementType) => agreementDecisions[agreementType] === true,
  );

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

  useEffect(() => {
    if (initialDraft) return;
    if (!draftScope) {
      clearSignupOnboardingDrafts();
      return;
    }

    let cancelled = false;
    void loadOnboardingDraft(draftScope).then((restored) => {
      if (cancelled) return;
      if (restored) {
        setCurrentStep(Math.min(restored.currentStep, finalStep) as OnboardingStep);
        setDisplayName(restored.displayName);
        setBirthDate(restored.birthDate);
        restoreMessagingCountries(restored.nationality, restored.messagingCountry);
        setMessagingApp(restored.messagingApp);
        setMessagingContact(restored.messagingContact);
        setAgreementDecisions(restored.agreementDecisions);
        setProfileImageFile(restored.profileImageFile);
        setExistingProfileImageKey(restored.existingProfileImageKey);
        setExistingProfileImageUrl(restored.existingProfileImageUrl);
      }
      setIsDraftPersistenceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [draftScope, finalStep, initialDraft, restoreMessagingCountries]);

  useEffect(() => {
    if (!draftScope || !isDraftPersistenceReady || draftPersistenceDisabledRef.current) return;

    saveOnboardingDraft(draftScope, {
      currentStep,
      displayName,
      birthDate,
      nationality,
      messagingApp,
      messagingCountry,
      messagingContact,
      agreementDecisions,
      profileImageFile,
      existingProfileImageKey,
      existingProfileImageUrl,
    });
  }, [
    agreementDecisions,
    birthDate,
    currentStep,
    displayName,
    draftScope,
    existingProfileImageKey,
    existingProfileImageUrl,
    isDraftPersistenceReady,
    messagingApp,
    messagingContact,
    messagingCountry,
    nationality,
    profileImageFile,
  ]);

  useEffect(() => {
    const handlePageHide = () => clearExpiredOnboardingDrafts();
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  useEffect(() => {
    if (openAgreementType === null) agreementTriggerRef.current?.focus();
  }, [openAgreementType]);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isSupportedProfileImageType(file.type)) {
      setRequestFailure(null);
      setErrorKey("validation.unsupportedImageType");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setRequestFailure(null);
      setErrorKey("validation.imageTooLarge");
      event.target.value = "";
      return;
    }

    setErrorKey(null);
    setRequestFailure(null);
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  }

  function handleProfileImageRemove() {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    if (profileImageInputRef.current) profileImageInputRef.current.value = "";
    setProfileImageFile(null);
    setProfileImagePreview("");
    setExistingProfileImageKey(null);
    setExistingProfileImageUrl(null);
    uploadedProfileImageRef.current = null;
    setErrorKey(null);
    setRequestFailure(null);
  }

  function handleMessagingAppChange(nextApp: MessagingAppKey) {
    setMessagingApp(nextApp);
    // 전화번호형 <-> ID형 값이 섞이지 않도록 앱 전환 시 연락처 입력을 비운다
    setMessagingContact("");
  }

  function handleAgreementChange(type: SignupAgreementType, agreed: boolean) {
    setAgreementDecisions((current) => ({ ...current, [type]: agreed }));
    setErrorKey(null);
  }

  function handleAllAgreementsChange(agreed: boolean) {
    setAgreementDecisions((current) => {
      const next = { ...current };
      for (const type of agreementTypes) next[type] = agreed;
      return next;
    });
    setErrorKey(null);
  }

  function handleDisplayNameChange(value: string) {
    setDisplayName(value);
    if (errorKey === "validation.displayNameInvalid" && isValidDisplayName(value)) {
      setErrorKey(null);
    }
  }

  function handleDisplayNameBlur() {
    if (!isValidDisplayName(displayName)) {
      setRequestFailure(null);
      setErrorKey("validation.displayNameInvalid");
    }
  }

  async function resolveProfileImageKey(): Promise<string | null | undefined> {
    if (!profileImageFile) return isResubmission ? existingProfileImageKey : undefined;
    if (uploadedProfileImageRef.current?.file === profileImageFile) {
      return uploadedProfileImageRef.current.imageKey;
    }

    const uploaded = await uploadProfileImage(profileImageFile);
    uploadedProfileImageRef.current = { file: profileImageFile, imageKey: uploaded.imageKey };
    return uploaded.imageKey;
  }

  function validateAboutYou() {
    if (!isValidDisplayName(displayName)) {
      setErrorKey("validation.displayNameInvalid");
      return false;
    }
    if (!nationality) {
      setErrorKey("validation.nationalityRequired");
      return false;
    }

    const today = getLocalDateInputValue(new Date());
    const oldestBirthDate = subtractYearsFromDateInput(today, MAXIMUM_SIGNUP_AGE);
    const youngestBirthDate = subtractYearsFromDateInput(today, MINIMUM_SIGNUP_AGE);
    if (
      !isValidDateInputValue(birthDate) ||
      birthDate < oldestBirthDate ||
      birthDate > youngestBirthDate
    ) {
      setErrorKey("validation.birthDateInvalid");
      return false;
    }
    return true;
  }

  function validateContact() {
    const contactIdentifier = messagingContact.trim();
    const requiresContactCountryCode = messagingApp === "whatsapp" || messagingApp === "phone";
    const contactCountryCode = requiresContactCountryCode
      ? findCountry(messagingCountry)?.dialCode
      : "";

    const normalizedPhoneNumber = contactIdentifier.replace(/[ -]/g, "");
    const isUnrestrictedMessenger = messagingApp === "kakaotalk" || messagingApp === "instagram";
    const isValidMessengerId = isUnrestrictedMessenger
      ? contactIdentifier.length > 0 && contactIdentifier.length <= MAX_MESSENGER_ID_LENGTH
      : MESSENGER_CONTACT_PATTERN.test(contactIdentifier);
    const isValidContact = requiresContactCountryCode
      ? COUNTRY_CALLING_CODE_PATTERN.test(contactCountryCode ?? "") &&
        PHONE_CONTACT_PATTERN.test(normalizedPhoneNumber)
      : isValidMessengerId;

    if (!isBuddyFlow && (messagingApp === "line" || messagingApp === "wechat")) {
      setErrorKey("validation.contactMethodRequired");
      return false;
    }

    if (!isValidContact) {
      setErrorKey("validation.contactInvalid");
      return false;
    }
    return true;
  }

  function validateAgreements() {
    if (!hasAllRequiredSignupAgreements(userType, agreementDecisions)) {
      setErrorKey("validation.agreementsRequired");
      return false;
    }
    return true;
  }

  function goToStep(step: OnboardingStep) {
    setErrorKey(null);
    setRequestFailure(null);
    setCurrentStep(step);
  }

  function discardDraft() {
    draftPersistenceDisabledRef.current = true;
    if (draftScope) clearOnboardingDraft(draftScope);
  }

  function validateExtra(step: 1 | 2) {
    const error =
      step === 1
        ? isResubmission
          ? null
          : validateSignupSource(signupExtra)
        : validateSignupBank(signupExtra, userType);
    setSignupExtraError(error);
    return error === null;
  }

  function handleContinue() {
    setErrorKey(null);
    setRequestFailure(null);

    if (currentStep === 1 && validateAboutYou() && validateExtra(1)) goToStep(2);
    if (currentStep === 2 && !isResubmission) {
      // A restored legacy draft may have progressed without collecting a signup source.
      if (!validateExtra(1)) {
        goToStep(1);
        return;
      }
      if (validateContact() && validateExtra(2)) goToStep(3);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    setErrorKey(null);
    setRequestFailure(null);

    if (currentStep !== finalStep) {
      handleContinue();
      return;
    }

    if (!validateAboutYou() || !validateExtra(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateContact() || !validateExtra(2)) {
      setCurrentStep(2);
      return;
    }
    if (!isResubmission && !validateAgreements()) return;

    const contactIdentifier = messagingContact.trim();
    const requiresContactCountryCode = messagingApp === "whatsapp" || messagingApp === "phone";
    const contactCountryCode = requiresContactCountryCode
      ? findCountry(messagingCountry)?.dialCode
      : "";

    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      let profileImageKey: string | null | undefined;
      try {
        profileImageKey = await resolveProfileImageKey();
      } catch (error) {
        setRequestFailure({ error, fallbackKey: "profileUploadFailed" });
        return;
      }

      const commonProfile = {
        displayName: displayName.trim(),
        nationalityCode: nationality,
        birthDate,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode: contactCountryCode ?? "",
        contactIdentifier,
      };
      const payload: GoogleSignupRequest | BuddyResubmissionRequest = isResubmission
        ? {
            ...commonProfile,
            profileImageKey: profileImageKey ?? null,
            ...(isBankName(signupExtra.bankName)
              ? {
                  bankName: signupExtra.bankName,
                  bankAccountNumber: signupExtra.bankAccountNumber.trim(),
                }
              : {}),
          }
        : {
            ...commonProfile,
            userType,
            ...buildSignupExtra(signupExtra, userType),
            ...(profileImageKey ? { profileImageKey } : {}),
            agreements: buildSignupAgreements(userType, agreementDecisions, agreementDocuments),
          };

      const response = await fetch(
        isResubmission ? "/api/auth/buddy/resubmission" : "/api/auth/google/signup",
        {
          method: isResubmission ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => undefined)) as
        ApiResponse<GoogleLoginResponse | BuddyResubmission> | ErrorApiResponse | undefined;

      if (!response.ok || !body?.isSuccess) {
        if (body && !body.isSuccess) {
          if (!isResubmission && body.code === "AUTH400_SIGNUP_SOURCE") {
            setSignupExtraError({ field: "source", key: "sourceInvalid" });
            goToStep(1);
          } else if (body.code === "AUTH400_BANK_ACCOUNT") {
            setSignupExtraError({ field: "bank", key: "bankInvalid" });
            goToStep(2);
          }
        }
        setRequestFailure({
          error: createApiClientError(response.status, body && !body.isSuccess ? body : undefined),
          fallbackKey: isResubmission ? "resubmissionFailed" : "signupFailed",
        });
        return;
      }

      if (!isResubmission) await invalidateAnalyticsAccount();

      if (isResubmission) {
        if ((body.result as BuddyResubmission).accountStatus !== "PENDING_APPROVAL") {
          setRequestFailure({
            error: createApiClientError(502, undefined),
            fallbackKey: "resubmissionFailed",
          });
          return;
        }
        discardDraft();
        router.replace("/buddy/auth/status?status=PENDING_APPROVAL");
        router.refresh();
        return;
      }

      const signupResult = body.result as GoogleLoginResponse;
      const authStatus = signupResult.authStatus;
      if (signupResult.registered === true) trackSignup("google");
      if (authStatus === "ACTIVE") {
        discardDraft();
        router.replace(userType === "BUDDY" ? "/dashboard" : "/");
      } else if (
        authStatus === "PENDING_APPROVAL" ||
        authStatus === "REJECTED" ||
        authStatus === "SUSPENDED"
      ) {
        discardDraft();
        router.replace(`/buddy/auth/status?status=${authStatus}`);
      } else {
        setRequestFailure({
          error: createApiClientError(502, undefined),
          fallbackKey: "signupFailed",
        });
        return;
      }
      router.refresh();
    } catch (error) {
      setRequestFailure({ error, fallbackKey: "serverUnavailable" });
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  let profilePhoto = (
    <div className="flex size-16 items-center justify-center rounded-2xl border border-line-soft bg-canvas-soft ring-4 ring-primary-soft max-md:size-14">
      <Image
        src="/images/brand/logo-borderless.webp"
        alt={t("defaultProfilePhoto")}
        width={40}
        height={40}
        className="size-10 object-contain max-md:size-8"
      />
    </div>
  );
  if (profileImagePreview) {
    profilePhoto = (
      <Image
        src={profileImagePreview}
        alt={t("selectedProfilePhotoPreview")}
        width={64}
        height={64}
        unoptimized
        className="size-16 rounded-2xl border border-line-soft object-cover ring-4 ring-primary-soft max-md:size-14"
      />
    );
  } else if (existingProfileImageUrl) {
    profilePhoto = (
      <Image
        src={existingProfileImageUrl}
        alt={t("selectedProfilePhotoPreview")}
        width={64}
        height={64}
        unoptimized
        className="size-16 rounded-2xl border border-line-soft object-cover ring-4 ring-primary-soft max-md:size-14"
      />
    );
  }

  const hasDisplayNameError = errorKey === "validation.displayNameInvalid";
  let errorMessage: string | null = null;
  if (requestFailure) {
    if (requestFailure.fallbackKey === "resubmissionFailed") {
      errorMessage = getApiErrorMessage(requestFailure.error, resubmissionT("resubmissionFailed"));
    } else {
      errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
    }
  } else if (errorKey && !hasDisplayNameError) {
    errorMessage = t(errorKey);
  }

  function getRoleCopy() {
    if (isResubmission) {
      return {
        title: resubmissionT("title"),
        eyebrow: resubmissionT("eyebrow"),
        headline: resubmissionT("headline"),
        contactMethods: buddyT("contactMethods"),
        submit: resubmissionT("submit"),
        submitting: resubmissionT("submitting"),
      };
    }
    if (isBuddyFlow) {
      return {
        title: buddyT("title"),
        eyebrow: buddyT("eyebrow"),
        headline: buddyT("headline"),
        contactMethods: buddyT("contactMethods"),
        submit: buddyT("completeRegistration"),
        submitting: buddyT("completing"),
      };
    }
    return {
      title: t("title"),
      eyebrow: t("eyebrow"),
      headline: t("headline"),
      contactMethods: t("contactMethods"),
      submit: t("completeRegistration"),
      submitting: t("completing"),
    };
  }

  const roleCopy = getRoleCopy();

  const agreementItems: Array<{
    type: SignupAgreementType;
    label: string;
  }> = [
    {
      type: "ADULT_CONFIRMATION",
      label: t("agreements.items.adultConfirmation"),
    },
    {
      type: "TERMS_OF_SERVICE",
      label: t("agreements.items.termsOfService"),
    },
    {
      type: "PRIVACY_COLLECTION_USE",
      label: t("agreements.items.privacyCollectionUse"),
    },
    ...(userType === "BUDDY"
      ? [
          {
            type: "BUDDY_OPERATION_TERMS" as const,
            label: t("agreements.items.buddyOperationTerms"),
          },
          {
            type: "BUDDY_COMMISSION_POLICY" as const,
            label: t("agreements.items.buddyCommissionPolicy"),
          },
        ]
      : []),
    {
      type: "MARKETING_COMMUNICATION",
      label: t("agreements.items.marketingCommunication"),
    },
  ];
  const stepLabels = isResubmission
    ? [t("steps.aboutYou"), buddyT("contactMethods")]
    : [
        t("steps.aboutYou"),
        isBuddyFlow ? buddyT("contactMethods") : t("steps.contact"),
        t("steps.agreements"),
      ];

  return (
    <div className={`${mobileStyles.compact} flex flex-1 flex-col bg-canvas-soft pb-24 lg:pb-0`}>
      <main className="flex-1 py-3 max-md:py-2 md:py-4">
        <PageContainer>
          <div className="mx-auto mt-2 grid w-full max-w-[1280px] grid-cols-[40px_minmax(0,1fr)] items-start gap-4 max-md:mt-0 max-md:grid-cols-[32px_minmax(0,1fr)] max-md:gap-x-2 max-md:gap-y-1">
            <Link
              href={getOnboardingBackHref(isResubmission, isBuddyFlow)}
              aria-label={accessibilityT("close")}
              onNavigate={discardDraft}
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong max-md:size-8"
            >
              <XIcon className="size-5 max-md:size-4" />
            </Link>
            <header className="min-w-0 pt-1 text-left max-md:contents">
              <p className="font-display text-[11px] font-bold tracking-[0.22em] text-primary uppercase max-md:self-center max-md:tracking-[0.16em]">
                {roleCopy.eyebrow}
              </p>
              <h1 className="mt-1.5 font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink max-md:col-span-2 max-md:mt-0 max-md:text-lg md:text-2xl lg:whitespace-nowrap">
                {roleCopy.headline}
              </h1>
            </header>
          </div>

          <form
            id="google-onboarding-form"
            aria-label={roleCopy.title}
            noValidate
            onSubmit={handleSubmit}
            onKeyDownCapture={(event) => {
              if (event.key === "Enter" && event.repeat) event.preventDefault();
            }}
            className={`mx-auto mt-5 grid w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-line-soft bg-canvas-soft max-md:mt-3 max-md:rounded-[20px] lg:grid-cols-[250px_minmax(0,1fr)] ${currentStep === 3 ? "" : "lg:min-h-[620px]"}`}
          >
            <nav
              aria-label={t("steps.progress", { current: currentStep, total: stepLabels.length })}
              className="border-b border-line-soft px-5 py-4 max-md:px-3 max-md:py-2.5 lg:border-r lg:border-b-0 lg:px-8 lg:py-12"
            >
              <p className="mb-4 hidden text-xs font-bold tracking-[0.18em] text-primary uppercase lg:block">
                {t("steps.progress", { current: currentStep, total: stepLabels.length })}
              </p>
              <ol
                className={`${isResubmission ? "grid-cols-2" : "grid-cols-3"} grid gap-2 lg:flex lg:flex-col lg:gap-5`}
              >
                {stepLabels.map((label, index) => {
                  const step = (index + 1) as OnboardingStep;
                  const isActive = currentStep === step;
                  const isComplete = currentStep > step;
                  return (
                    <li
                      key={label}
                      aria-current={isActive ? "step" : undefined}
                      className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2.5 sm:text-left"
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold max-md:size-6 ${
                          isActive || isComplete
                            ? "border-primary bg-primary text-on-primary"
                            : "border-line-strong bg-canvas-soft text-muted"
                        }`}
                      >
                        {step}
                      </span>
                      <span
                        className={`min-w-0 text-xs leading-4 font-semibold break-keep sm:text-sm sm:leading-5 ${
                          isActive ? "text-primary-strong" : "text-muted"
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="flex min-w-0 flex-col">
              {currentStep === 1 ? (
                <section className="px-5 py-8 max-md:px-4 max-md:py-4 md:px-12 md:py-10 lg:px-16 lg:py-14">
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="font-display text-xl font-bold text-ink outline-none max-md:text-base"
                    >
                      {t("personalInformation")}
                    </h2>
                  </div>

                  <div className="mt-8 max-w-2xl space-y-6 max-md:mt-4 max-md:space-y-4">
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-4 max-md:grid-cols-[56px_minmax(0,1fr)]">
                      <div className="relative size-16 shrink-0 max-md:size-14">
                        {profilePhoto}
                        <label className="absolute -right-2 -bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-colors focus-within:ring-2 focus-within:ring-primary-strong focus-within:ring-offset-2 hover:bg-primary-hover max-md:size-7">
                          <CameraIcon className="size-4" />
                          <span className="sr-only">{t("addProfilePhoto")}</span>
                          <input
                            ref={profileImageInputRef}
                            type="file"
                            accept={PROFILE_IMAGE_CONTENT_TYPES.join(",")}
                            className="sr-only"
                            onChange={handleProfileImageChange}
                          />
                        </label>
                        {isResubmission && (profileImagePreview || existingProfileImageUrl) ? (
                          <button
                            type="button"
                            onClick={handleProfileImageRemove}
                            aria-label={resubmissionT("removeProfilePhoto")}
                            className="absolute -top-2 -left-2 flex size-8 items-center justify-center rounded-full border border-line-soft bg-white text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <label className="flex min-w-0 flex-col gap-1.5">
                          <span className="text-sm font-medium text-ink">{t("displayName")}</span>
                          <input
                            name="displayName"
                            type="text"
                            required
                            minLength={2}
                            maxLength={30}
                            pattern={DISPLAY_NAME_PATTERN}
                            value={displayName}
                            onChange={(event) => handleDisplayNameChange(event.target.value)}
                            onBlur={handleDisplayNameBlur}
                            aria-label={t("displayName")}
                            aria-describedby={
                              hasDisplayNameError ? "onboarding-display-name-error" : undefined
                            }
                            aria-invalid={hasDisplayNameError}
                            className="focus-border-only h-11 w-full rounded-xl border border-line-soft bg-canvas-soft px-3 text-sm text-ink transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                          />
                        </label>
                        {hasDisplayNameError ? (
                          <p
                            id="onboarding-display-name-error"
                            role="alert"
                            className="mt-2 text-xs leading-5 text-danger"
                          >
                            {t("displayNameHint")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      data-testid="onboarding-personal-fields"
                      className="grid gap-4 max-md:gap-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink">{t("nationality")}</span>
                        <CountrySelect
                          value={nationality}
                          onChange={handleNationalityChange}
                          ariaLabel={t("nationality")}
                          triggerClassName={`${ONBOARDING_SELECT_TRIGGER} gap-2 px-4`}
                        />
                      </div>
                      <BirthDatePicker
                        value={birthDate}
                        today={currentLocalDate}
                        oldestAllowedBirthDate={oldestAllowedBirthDate}
                        youngestAllowedBirthDate={youngestAllowedBirthDate}
                        invalid={errorKey === "validation.birthDateInvalid"}
                        onChange={(value) => {
                          setBirthDate(value);
                          if (
                            isValidBirthDate(
                              value,
                              currentLocalDate,
                              oldestAllowedBirthDate,
                              youngestAllowedBirthDate,
                            )
                          )
                            setErrorKey(null);
                        }}
                      />
                    </div>

                    {!isResubmission && (
                      <SignupExtraFields
                        value={signupExtra}
                        section="source"
                        error={signupExtraError}
                        onChange={(value) => {
                          setSignupExtra(value);
                          setSignupExtraError(null);
                        }}
                      />
                    )}

                    {resubmission?.rejectionReason ? (
                      <div
                        data-testid="resubmission-rejection-reason"
                        className="rounded-2xl border border-line-soft bg-canvas-soft px-4 py-3"
                      >
                        <p className="text-xs font-bold text-primary-strong">
                          {resubmissionT("rejectionReason")}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink">
                          {resubmission.rejectionReason}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {currentStep === 2 ? (
                <section className="px-5 py-8 max-md:px-4 max-md:py-4 md:px-12 md:py-10 lg:px-16 lg:py-14">
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="font-display text-xl font-bold text-ink outline-none max-md:text-base"
                    >
                      {roleCopy.contactMethods}
                    </h2>
                  </div>
                  <div className="mt-8 flex max-w-3xl flex-col gap-1.5 max-md:mt-4">
                    <span className="text-sm font-medium text-ink">
                      {isBuddyFlow ? messagingT("phoneNumber") : t("preferredMessagingApp")}
                    </span>
                    <MessagingAppField
                      touristSignup={!isBuddyFlow}
                      app={messagingApp}
                      onAppChange={handleMessagingAppChange}
                      country={messagingCountry}
                      onCountryChange={handleMessagingCountryChange}
                      contactValue={messagingContact}
                      onContactChange={setMessagingContact}
                      inputName="contactIdentifier"
                      inputRequired
                      variant="cards"
                      showAppSelector={!isBuddyFlow}
                    />
                  </div>
                  {isBuddyFlow && (
                    <SignupExtraFields
                      value={signupExtra}
                      section="bank"
                      error={signupExtraError}
                      onChange={(value) => {
                        setSignupExtra(value);
                        setSignupExtraError(null);
                      }}
                    />
                  )}
                </section>
              ) : null}

              {!isResubmission && currentStep === 3 ? (
                <section className="px-5 py-6 max-md:px-4 max-md:py-4 md:px-12 md:py-8 lg:px-16">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2
                        ref={stepHeadingRef}
                        tabIndex={-1}
                        className="font-display text-xl font-bold text-ink outline-none max-md:text-base"
                      >
                        {t("agreements.title")}
                      </h2>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-full border border-line-soft px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary sm:self-auto">
                      <input
                        type="checkbox"
                        checked={allAgreementsSelected}
                        onChange={(event) => handleAllAgreementsChange(event.target.checked)}
                        className="size-4 accent-primary"
                      />
                      {t("agreements.agreeAll")}
                    </label>
                  </div>

                  <div className="mt-5 max-w-3xl divide-y divide-line-soft border-y border-line-soft max-md:mt-3">
                    {agreementItems.map((item) => {
                      const isRequired = requiredAgreementTypes.includes(item.type);
                      return (
                        <div
                          key={item.type}
                          className="flex items-center gap-2 py-1.5 max-md:py-0.5"
                        >
                          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              aria-label={item.label}
                              checked={agreementDecisions[item.type] === true}
                              onChange={(event) =>
                                handleAgreementChange(item.type, event.target.checked)
                              }
                              className="size-4 accent-primary"
                            />
                          </label>
                          {item.type === "ADULT_CONFIRMATION" ? (
                            <span className="min-w-0 flex-1 text-sm leading-5 text-ink">
                              {item.label}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                agreementTriggerRef.current = event.currentTarget;
                                setOpenAgreementType(item.type);
                              }}
                              className="min-w-0 flex-1 text-left text-sm leading-5 font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                            >
                              {item.label}
                            </button>
                          )}
                          <span
                            className={
                              isRequired
                                ? "shrink-0 text-xs font-semibold text-primary"
                                : "shrink-0 text-xs font-semibold text-muted"
                            }
                          >
                            {isRequired ? t("agreements.required") : t("agreements.optional")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {errorMessage ? (
                <p
                  role="alert"
                  className="mx-5 mb-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger md:mx-8 md:mb-8"
                >
                  {errorMessage}
                </p>
              ) : null}
              <div className="fixed inset-x-0 bottom-0 z-30 mt-auto flex justify-end gap-2 bg-canvas-soft px-4 py-3 shadow-[0_-8px_24px_rgba(61,45,43,0.08)] lg:static lg:bg-transparent lg:px-16 lg:py-6 lg:shadow-none">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => goToStep((currentStep - 1) as OnboardingStep)}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-line-soft bg-canvas-soft px-5 font-display text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary lg:flex-none"
                  >
                    <ArrowRightIcon className="size-4 rotate-180" />
                    {t("steps.back")}
                  </button>
                ) : null}
                <button
                  key={currentStep}
                  form="google-onboarding-form"
                  type={currentStep === finalStep ? "submit" : "button"}
                  onClick={(event) => {
                    // A click that advances a step must never activate the new submit action.
                    if (event.detail > 1) {
                      event.preventDefault();
                      return;
                    }
                    if (currentStep !== finalStep) {
                      event.preventDefault();
                      handleContinue();
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60 lg:min-w-32 lg:flex-none"
                >
                  {currentStep === finalStep
                    ? isSubmitting
                      ? roleCopy.submitting
                      : roleCopy.submit
                    : t("steps.continue")}
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>
            </div>
          </form>
        </PageContainer>
      </main>
      {openAgreementType ? (
        <SignupAgreementNoticeDialog
          agreementType={openAgreementType}
          userType={userType}
          title={agreementItems.find((item) => item.type === openAgreementType)?.label ?? ""}
          document={agreementDocuments?.[openAgreementType]}
          onClose={() => setOpenAgreementType(null)}
        />
      ) : null}
    </div>
  );
}
