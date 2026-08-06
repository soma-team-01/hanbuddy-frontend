"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChangeEvent, FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, XIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { createApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import {
  buildSignupAgreements,
  getRequiredSignupAgreementTypes,
  getSignupAgreementTypes,
  hasAllRequiredSignupAgreements,
} from "@/lib/auth/signup-agreements";
import { findCountry } from "@/lib/countries";
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
  ErrorApiResponse,
  GoogleLoginResponse,
  GoogleProfile,
  GoogleSignupRequest,
  SignupAgreementType,
  UserType,
} from "@/lib/auth/types";

type OnboardingValidationErrorKey = keyof (typeof messages)["Onboarding"]["validation"];
type OnboardingErrorKey =
  | `validation.${OnboardingValidationErrorKey}`
  | "profileUploadFailed"
  | "signupFailed"
  | "serverUnavailable";

interface OnboardingFormProps {
  googleProfile?: GoogleProfile;
  userType?: UserType;
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

export function OnboardingForm({
  googleProfile,
  userType = "TOURIST",
}: Readonly<OnboardingFormProps>) {
  const t = useTranslations("Onboarding");
  const buddyT = useTranslations("BuddyOnboarding");
  const accessibilityT = useTranslations("Accessibility");
  const getApiErrorMessage = useApiErrorMessage();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [displayName, setDisplayName] = useState(googleProfile?.name ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>("line");
  const [messagingContact, setMessagingContact] = useState("");
  const [agreementDecisions, setAgreementDecisions] = useState<
    Partial<Record<SignupAgreementType, boolean>>
  >({});
  const [errorKey, setErrorKey] = useState<OnboardingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: Extract<
      OnboardingErrorKey,
      "profileUploadFailed" | "signupFailed" | "serverUnavailable"
    >;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  // 같은 파일로 재제출할 때(회원가입 요청만 실패한 경우) S3 업로드를 반복하지 않기 위한 캐시
  const uploadedProfileImageRef = useRef<{ file: File; imageKey: string } | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync("");
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

  async function resolveProfileImageKey(): Promise<string | undefined> {
    if (!profileImageFile) return undefined;
    if (uploadedProfileImageRef.current?.file === profileImageFile) {
      return uploadedProfileImageRef.current.imageKey;
    }

    const uploaded = await uploadProfileImage(profileImageFile);
    uploadedProfileImageRef.current = { file: profileImageFile, imageKey: uploaded.imageKey };
    return uploaded.imageKey;
  }

  function validateAboutYou() {
    const trimmedDisplayName = displayName.trim();
    if (
      trimmedDisplayName.length < 2 ||
      trimmedDisplayName.length > 30 ||
      trimmedDisplayName !== displayName
    ) {
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
    const isValidContact = requiresContactCountryCode
      ? COUNTRY_CALLING_CODE_PATTERN.test(contactCountryCode ?? "") &&
        PHONE_CONTACT_PATTERN.test(normalizedPhoneNumber)
      : MESSENGER_CONTACT_PATTERN.test(contactIdentifier);

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

  function handleContinue() {
    setErrorKey(null);
    setRequestFailure(null);

    if (currentStep === 1 && validateAboutYou()) goToStep(2);
    if (currentStep === 2 && validateContact()) goToStep(3);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setRequestFailure(null);

    if (currentStep !== 3) {
      handleContinue();
      return;
    }

    if (!validateAboutYou()) {
      setCurrentStep(1);
      return;
    }
    if (!validateContact()) {
      setCurrentStep(2);
      return;
    }
    if (!validateAgreements()) return;

    const contactIdentifier = messagingContact.trim();
    const requiresContactCountryCode = messagingApp === "whatsapp" || messagingApp === "phone";
    const contactCountryCode = requiresContactCountryCode
      ? findCountry(messagingCountry)?.dialCode
      : "";

    setIsSubmitting(true);
    try {
      let profileImageKey: string | undefined;
      try {
        profileImageKey = await resolveProfileImageKey();
      } catch (error) {
        setRequestFailure({ error, fallbackKey: "profileUploadFailed" });
        return;
      }

      const payload: GoogleSignupRequest = {
        userType,
        displayName: displayName.trim(),
        ...(profileImageKey ? { profileImageKey } : {}),
        nationalityCode: nationality,
        birthDate,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode,
        contactIdentifier,
        agreements: buildSignupAgreements(userType, agreementDecisions),
      };

      const response = await fetch("/api/auth/google/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => undefined)) as
        ApiResponse<GoogleLoginResponse> | ErrorApiResponse | undefined;

      if (!response.ok || !body?.isSuccess) {
        setRequestFailure({
          error: createApiClientError(response.status, body && !body.isSuccess ? body : undefined),
          fallbackKey: "signupFailed",
        });
        return;
      }

      const authStatus = body.result.authStatus;
      if (authStatus === "ACTIVE") {
        router.replace(userType === "BUDDY" ? "/dashboard" : "/");
      } else if (
        authStatus === "PENDING_APPROVAL" ||
        authStatus === "REJECTED" ||
        authStatus === "SUSPENDED"
      ) {
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
      setIsSubmitting(false);
    }
  }

  let profilePhoto = (
    <div className="flex size-16 items-center justify-center rounded-2xl border border-line-soft bg-canvas-soft ring-4 ring-primary-soft">
      <Image
        src="/images/brand/logo-borderless.webp"
        alt={t("defaultProfilePhoto")}
        width={40}
        height={40}
        className="size-10 object-contain"
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
        className="size-16 rounded-2xl border border-line-soft object-cover ring-4 ring-primary-soft"
      />
    );
  }

  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }

  const roleCopy = {
    title: userType === "BUDDY" ? buddyT("title") : t("title"),
    eyebrow: userType === "BUDDY" ? buddyT("eyebrow") : t("eyebrow"),
    headline: userType === "BUDDY" ? buddyT("headline") : t("headline"),
    description: userType === "BUDDY" ? buddyT("description") : t("description"),
    photoGuidance:
      userType === "BUDDY" ? buddyT("profilePhotoOptional") : t("profilePhotoOptional"),
    contactMethods: userType === "BUDDY" ? buddyT("contactMethods") : t("contactMethods"),
    contactDescription:
      userType === "BUDDY" ? buddyT("contactDescription") : t("contactDescription"),
    submit: userType === "BUDDY" ? buddyT("completeRegistration") : t("completeRegistration"),
    submitting: userType === "BUDDY" ? buddyT("completing") : t("completing"),
  };

  const agreementItems: Array<{
    type: SignupAgreementType;
    label: string;
    isDocument: boolean;
  }> = [
    {
      type: "ADULT_CONFIRMATION",
      label: t("agreements.items.adultConfirmation"),
      isDocument: false,
    },
    {
      type: "TERMS_OF_SERVICE",
      label: t("agreements.items.termsOfService"),
      isDocument: true,
    },
    {
      type: "PRIVACY_COLLECTION_USE",
      label:
        userType === "BUDDY"
          ? t("agreements.items.buddyPrivacyCollectionUse")
          : t("agreements.items.privacyCollectionUse"),
      isDocument: true,
    },
    ...(userType === "BUDDY"
      ? [
          {
            type: "BUDDY_OPERATION_TERMS" as const,
            label: t("agreements.items.buddyOperationTerms"),
            isDocument: true,
          },
          {
            type: "BUDDY_COMMISSION_POLICY" as const,
            label: t("agreements.items.buddyCommissionPolicy"),
            isDocument: true,
          },
          {
            type: "BUDDY_PROFILE_CONTACT_PROVISION" as const,
            label: t("agreements.items.buddyProfileContactProvision"),
            isDocument: true,
          },
        ]
      : []),
    {
      type: "MARKETING_COMMUNICATION",
      label: t("agreements.items.marketingCommunication"),
      isDocument: false,
    },
  ];
  const stepLabels = [t("steps.aboutYou"), t("steps.contact"), t("steps.agreements")];

  return (
    <div className="flex flex-1 flex-col bg-canvas-soft pb-24 lg:pb-0">
      <main className="flex-1 py-3 md:py-4">
        <PageContainer>
          <div className="mx-auto mt-2 grid w-full max-w-[1280px] grid-cols-[40px_minmax(0,1fr)] items-start gap-4">
            <Link
              href={userType === "BUDDY" ? "/buddy" : "/login"}
              aria-label={accessibilityT("close")}
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              <XIcon className="size-5" />
            </Link>
            <header className="min-w-0 pt-1 text-left">
              <p className="font-display text-[11px] font-bold tracking-[0.22em] text-primary uppercase">
                {roleCopy.eyebrow}
              </p>
              <h1 className="mt-1.5 font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-2xl lg:whitespace-nowrap">
                {roleCopy.headline}
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-muted lg:whitespace-nowrap">
                {roleCopy.description}
              </p>
            </header>
          </div>

          <form
            id="google-onboarding-form"
            aria-label={roleCopy.title}
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto mt-5 grid w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-line-soft bg-canvas-soft lg:min-h-[620px] lg:grid-cols-[250px_minmax(0,1fr)]"
          >
            <nav
              aria-label={t("steps.progress", { current: currentStep, total: stepLabels.length })}
              className="border-b border-line-soft px-5 py-4 lg:border-r lg:border-b-0 lg:px-8 lg:py-12"
            >
              <p className="mb-4 hidden text-xs font-bold tracking-[0.18em] text-primary uppercase lg:block">
                {t("steps.progress", { current: currentStep, total: stepLabels.length })}
              </p>
              <ol className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-5">
                {stepLabels.map((label, index) => {
                  const step = (index + 1) as OnboardingStep;
                  const isActive = currentStep === step;
                  const isComplete = currentStep > step;
                  return (
                    <li
                      key={label}
                      aria-current={isActive ? "step" : undefined}
                      className="flex min-w-0 items-center gap-2.5"
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          isActive || isComplete
                            ? "border-primary bg-primary text-on-primary"
                            : "border-line-strong bg-canvas-soft text-muted"
                        }`}
                      >
                        {step}
                      </span>
                      <span
                        className={`hidden truncate text-xs font-semibold sm:block sm:text-sm ${
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
                <section className="px-5 py-8 md:px-12 md:py-10 lg:px-16 lg:py-14">
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="font-display text-xl font-bold text-ink outline-none"
                    >
                      {t("personalInformation")}
                    </h2>
                  </div>

                  <div className="mt-8 max-w-2xl space-y-6">
                    <div className="grid items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                      <div className="relative shrink-0">
                        {profilePhoto}
                        <label className="absolute -right-2 -bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-colors focus-within:ring-2 focus-within:ring-primary-strong focus-within:ring-offset-2 hover:bg-primary-hover">
                          <CameraIcon className="size-4" />
                          <span className="sr-only">{t("addProfilePhoto")}</span>
                          <input
                            type="file"
                            accept={PROFILE_IMAGE_CONTENT_TYPES.join(",")}
                            className="sr-only"
                            onChange={handleProfileImageChange}
                          />
                        </label>
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
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            aria-label={t("displayName")}
                            className="h-11 w-full rounded-xl border border-line-soft bg-canvas-soft px-3 text-sm text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                          />
                        </label>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          {roleCopy.photoGuidance}
                        </p>
                      </div>
                    </div>

                    <div data-testid="onboarding-personal-fields" className="grid gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink">{t("nationality")}</span>
                        <CountrySelect
                          value={nationality}
                          onChange={handleNationalityChange}
                          ariaLabel={t("nationality")}
                          triggerClassName="flex w-full items-center justify-between gap-2 rounded-xl border border-line-soft bg-canvas-soft px-4 py-3 text-base text-ink transition-colors hover:border-line-strong"
                        />
                      </div>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-ink">{t("birthDate")}</span>
                        <input
                          name="birthDate"
                          type="date"
                          min={oldestAllowedBirthDate || undefined}
                          max={youngestAllowedBirthDate || undefined}
                          required
                          value={birthDate}
                          onChange={(event) => setBirthDate(event.target.value)}
                          aria-label={t("birthDate")}
                          className="w-full rounded-xl border border-line-soft bg-canvas-soft px-4 py-3 text-base text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              ) : null}

              {currentStep === 2 ? (
                <section className="px-5 py-8 md:px-12 md:py-10 lg:px-16 lg:py-14">
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="font-display text-xl font-bold text-ink outline-none"
                    >
                      {roleCopy.contactMethods}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{roleCopy.contactDescription}</p>
                  </div>
                  <div className="mt-8 flex max-w-3xl flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">
                      {t("preferredMessagingApp")}
                    </span>
                    <MessagingAppField
                      app={messagingApp}
                      onAppChange={handleMessagingAppChange}
                      country={messagingCountry}
                      onCountryChange={handleMessagingCountryChange}
                      contactValue={messagingContact}
                      onContactChange={setMessagingContact}
                      inputName="contactIdentifier"
                      inputRequired
                      variant="cards"
                    />
                  </div>
                </section>
              ) : null}

              {currentStep === 3 ? (
                <section className="px-5 py-8 md:px-12 md:py-10 lg:px-16 lg:py-14">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2
                        ref={stepHeadingRef}
                        tabIndex={-1}
                        className="font-display text-xl font-bold text-ink outline-none"
                      >
                        {t("agreements.title")}
                      </h2>
                      <p className="mt-1 text-sm text-muted">{t("agreements.description")}</p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 self-start rounded-full border border-line-soft px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary sm:self-auto">
                      <input
                        type="checkbox"
                        checked={allAgreementsSelected}
                        onChange={(event) => handleAllAgreementsChange(event.target.checked)}
                        className="size-4 accent-primary"
                      />
                      {t("agreements.agreeAll")}
                    </label>
                  </div>

                  <div className="mt-7 max-w-3xl divide-y divide-line-soft border-y border-line-soft">
                    {agreementItems.map((item) => {
                      const isRequired = requiredAgreementTypes.includes(item.type);
                      return (
                        <label
                          key={item.type}
                          className="flex cursor-pointer items-start gap-3 py-3.5"
                        >
                          <input
                            type="checkbox"
                            checked={agreementDecisions[item.type] === true}
                            onChange={(event) =>
                              handleAgreementChange(item.type, event.target.checked)
                            }
                            className="mt-0.5 size-4 shrink-0 accent-primary"
                          />
                          <span className="flex min-w-0 flex-1 items-start justify-between gap-3 text-sm leading-5">
                            <span
                              className={
                                item.isDocument
                                  ? "font-medium text-primary underline decoration-primary/40 underline-offset-4"
                                  : "text-ink"
                              }
                            >
                              {item.label}
                            </span>
                            <span
                              className={
                                isRequired
                                  ? "shrink-0 text-xs font-semibold text-primary-strong"
                                  : "shrink-0 text-xs font-semibold text-muted"
                              }
                            >
                              {isRequired ? t("agreements.required") : t("agreements.optional")}
                            </span>
                          </span>
                        </label>
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
                    onClick={() => goToStep((currentStep - 1) as OnboardingStep)}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-line-soft bg-canvas-soft px-5 font-display text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary lg:flex-none"
                  >
                    <ArrowRightIcon className="size-4 rotate-180" />
                    {t("steps.back")}
                  </button>
                ) : null}
                <button
                  form="google-onboarding-form"
                  type={currentStep === 3 ? "submit" : "button"}
                  onClick={currentStep === 3 ? undefined : handleContinue}
                  disabled={isSubmitting}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60 lg:min-w-32 lg:flex-none"
                >
                  {currentStep === 3
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
    </div>
  );
}
