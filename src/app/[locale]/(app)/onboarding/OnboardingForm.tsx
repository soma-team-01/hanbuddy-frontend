"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, UserIcon, XIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { createApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
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

function getLocalDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
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
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>("line");
  const [messagingContact, setMessagingContact] = useState("");
  const [errorKey, setErrorKey] = useState<OnboardingErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: Extract<
      OnboardingErrorKey,
      "profileUploadFailed" | "signupFailed" | "serverUnavailable"
    >;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  // 같은 파일로 재제출할 때(회원가입 요청만 실패한 경우) S3 업로드를 반복하지 않기 위한 캐시
  const uploadedProfileImageRef = useRef<{ file: File; imageKey: string } | null>(null);
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync("");

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

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

  async function resolveProfileImageKey(): Promise<string | undefined> {
    if (!profileImageFile) return undefined;
    if (uploadedProfileImageRef.current?.file === profileImageFile) {
      return uploadedProfileImageRef.current.imageKey;
    }

    const uploaded = await uploadProfileImage(profileImageFile);
    uploadedProfileImageRef.current = { file: profileImageFile, imageKey: uploaded.imageKey };
    return uploaded.imageKey;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setRequestFailure(null);

    const formData = new FormData(event.currentTarget);
    const displayNameEntry = formData.get("displayName");
    const rawDisplayName = typeof displayNameEntry === "string" ? displayNameEntry : "";
    const displayName = rawDisplayName.trim();
    const birthDateEntry = formData.get("birthDate");
    const birthDate = typeof birthDateEntry === "string" ? birthDateEntry.trim() : "";
    const contactIdentifier = messagingContact.trim();
    const today = getLocalDateInputValue(new Date());

    if (!nationality) {
      setErrorKey("validation.nationalityRequired");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) {
      setErrorKey("validation.birthDateInvalid");
      return;
    }
    if (contactIdentifier.length < 2) {
      setErrorKey("validation.contactInvalid");
      return;
    }
    if (displayName.length < 2 || displayName.length > 30 || displayName !== rawDisplayName) {
      setErrorKey("validation.displayNameInvalid");
      return;
    }

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
        displayName,
        ...(profileImageKey ? { profileImageKey } : {}),
        nationalityCode: nationality,
        birthDate,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode:
          messagingApp === "whatsapp" || messagingApp === "phone"
            ? (findCountry(messagingCountry)?.dialCode ?? "")
            : "",
        contactIdentifier,
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

      router.replace(userType === "BUDDY" ? "/dashboard" : "/explore");
    } catch (error) {
      setRequestFailure({ error, fallbackKey: "serverUnavailable" });
    } finally {
      setIsSubmitting(false);
    }
  }

  let profilePhoto = (
    <div className="flex size-16 items-center justify-center rounded-2xl border border-line-soft bg-canvas-soft ring-4 ring-primary-soft">
      <UserIcon className="size-7 text-muted" />
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
  } else if (googleProfile?.picture) {
    profilePhoto = (
      <Image
        src={googleProfile.picture}
        alt={
          googleProfile.name ? t("profileFor", { name: googleProfile.name }) : t("googleProfile")
        }
        width={64}
        height={64}
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
    submit: userType === "BUDDY" ? buddyT("completeRegistration") : t("completeRegistration"),
    submitting: userType === "BUDDY" ? buddyT("completing") : t("completing"),
  };

  return (
    <div className="flex flex-1 flex-col bg-canvas-soft pb-24 lg:pb-0">
      <main className="flex-1 py-3 md:py-4">
        <PageContainer>
          <div className="flex h-10 items-center">
            <Link
              href={userType === "BUDDY" ? "/buddy" : "/login"}
              aria-label={accessibilityT("close")}
              className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              <XIcon className="size-5" />
            </Link>
          </div>

          <header className="mx-auto mt-1 max-w-none text-center lg:-mt-7">
            <p className="font-display text-xs font-bold tracking-[0.24em] text-primary uppercase">
              {roleCopy.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink md:text-3xl lg:whitespace-nowrap">
              {roleCopy.headline}
            </h1>
            <p className="mx-auto mt-2 max-w-none text-sm leading-6 text-muted md:text-base lg:whitespace-nowrap">
              {roleCopy.description}
            </p>
          </header>

          <form
            id="google-onboarding-form"
            aria-label={roleCopy.title}
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto mt-5 flex w-full max-w-[1120px] flex-col overflow-hidden rounded-[24px] border border-t-[3px] border-line-soft border-t-primary bg-canvas-soft shadow-[0_16px_48px_rgba(61,45,43,0.07)]"
          >
            <section className="flex items-center gap-4 px-5 py-4 md:px-6">
              <div className="relative">
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
              <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end sm:gap-5">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-semibold text-ink">{t("displayName")}</span>
                  <input
                    name="displayName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={30}
                    defaultValue={googleProfile?.name ?? ""}
                    aria-label={t("displayName")}
                    className="h-10 w-full rounded-xl border border-line-soft bg-canvas-soft px-3 text-sm text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                  />
                </label>
                <div className="min-w-0 pb-0.5">
                  <p className="text-xs leading-5 text-muted">{t("displayNameDescription")}</p>
                  <p className="text-xs leading-5 text-muted">{roleCopy.photoGuidance}</p>
                </div>
              </div>
            </section>

            <div className="grid border-t border-line-soft lg:grid-cols-2">
              <section className="flex flex-col gap-3 px-5 py-5 md:px-6 lg:border-r lg:border-line-soft">
                <h2 className="font-display text-lg font-bold text-ink">
                  {t("personalInformation")}
                </h2>
                <div data-testid="onboarding-personal-fields" className="grid gap-3">
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
                      max={getLocalDateInputValue(new Date())}
                      required
                      aria-label={t("birthDate")}
                      className="w-full rounded-xl border border-line-soft bg-canvas-soft px-4 py-3 text-base text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                    />
                  </label>
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-line-soft px-5 py-5 md:px-6 lg:border-t-0">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">{t("contactMethods")}</h2>
                  <p className="mt-0.5 text-sm text-muted">{t("contactDescription")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">{t("preferredMessagingApp")}</span>
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
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="mx-5 mb-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger md:mx-8 md:mb-8"
              >
                {errorMessage}
              </p>
            ) : null}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-canvas-soft px-4 py-3 shadow-[0_-8px_24px_rgba(61,45,43,0.08)] lg:static lg:flex lg:justify-end lg:px-6 lg:py-4 lg:shadow-none">
              <div className="w-full lg:w-72">
                <button
                  form="google-onboarding-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-base font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? roleCopy.submitting : roleCopy.submit}
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
