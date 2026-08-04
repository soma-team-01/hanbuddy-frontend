"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, UserIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
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
} from "@/lib/auth/types";

type OnboardingValidationErrorKey = keyof (typeof messages)["Onboarding"]["validation"];
type OnboardingErrorKey =
  | `validation.${OnboardingValidationErrorKey}`
  | "profileUploadFailed"
  | "signupFailed"
  | "serverUnavailable";

interface OnboardingFormProps {
  googleProfile?: GoogleProfile;
}

function getLocalDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function OnboardingForm({ googleProfile }: Readonly<OnboardingFormProps>) {
  const t = useTranslations("Onboarding");
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
        userType: "TOURIST",
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

      router.replace("/explore");
    } catch (error) {
      setRequestFailure({ error, fallbackKey: "serverUnavailable" });
    } finally {
      setIsSubmitting(false);
    }
  }

  let profilePhoto = (
    <div className="flex size-24 items-center justify-center rounded-2xl border border-line-soft bg-panel-raised">
      <UserIcon className="size-9 text-muted" />
    </div>
  );
  if (profileImagePreview) {
    profilePhoto = (
      <Image
        src={profileImagePreview}
        alt={t("selectedProfilePhotoPreview")}
        width={96}
        height={96}
        unoptimized
        className="size-24 rounded-2xl border border-line-soft object-cover"
      />
    );
  } else if (googleProfile?.picture) {
    profilePhoto = (
      <Image
        src={googleProfile.picture}
        alt={
          googleProfile.name ? t("profileFor", { name: googleProfile.name }) : t("googleProfile")
        }
        width={96}
        height={96}
        className="size-24 rounded-2xl border border-line-soft object-cover"
      />
    );
  }

  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }

  return (
    <div className="flex flex-1 flex-col bg-canvas-soft pb-28 lg:pb-0">
      <PageHeader closeHref="/login" />
      <main className="flex-1 pb-10 md:pb-16">
        <PageContainer>
          <header className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.24em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.045em] text-ink md:text-4xl">
              {t("headline")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted md:text-base">
              {t("description")}
            </p>
          </header>

          <form
            id="google-onboarding-form"
            aria-label={t("title")}
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex w-full max-w-[800px] flex-col overflow-hidden rounded-[28px] border border-line-soft bg-canvas-soft shadow-[0_20px_60px_rgba(61,45,43,0.08)] md:mt-10"
          >
            <section className="flex items-center gap-4 bg-panel-raised px-5 py-5 md:gap-5 md:px-8 md:py-6">
              <div className="relative">
                {profilePhoto}
                <label className="absolute -right-2 -bottom-2 flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-colors focus-within:ring-2 focus-within:ring-primary-strong focus-within:ring-offset-2 hover:bg-primary-hover">
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-ink md:text-lg">
                  {googleProfile?.name ?? t("profilePhotoHint")}
                </p>
                <p className="mt-1 truncate text-sm text-muted">
                  {googleProfile?.email ?? t("profilePhotoOptional")}
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-5 border-t border-line-soft px-5 py-7 md:px-8 md:py-8">
              <h2 className="font-display text-xl font-bold text-ink">
                {t("personalInformation")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-ink">{t("nationality")}</span>
                  <CountrySelect
                    value={nationality}
                    onChange={handleNationalityChange}
                    ariaLabel={t("nationality")}
                  />
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-ink">{t("birthDate")}</span>
                  <input
                    name="birthDate"
                    type="date"
                    max={getLocalDateInputValue(new Date())}
                    required
                    aria-label={t("birthDate")}
                    aria-describedby="birth-date-hint"
                    className="w-full rounded-xl border border-line-soft bg-panel-raised px-4 py-3.5 text-base text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary-soft focus:outline-none"
                  />
                  <span id="birth-date-hint" className="text-xs text-muted">
                    {t("birthDateHint")}
                  </span>
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-5 border-t border-line-soft px-5 py-7 md:px-8 md:py-8">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">{t("contactMethods")}</h2>
                <p className="mt-1 text-sm text-muted">{t("contactDescription")}</p>
              </div>
              <div className="flex flex-col gap-2">
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

            {errorMessage ? (
              <p
                role="alert"
                className="mx-5 mb-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger md:mx-8 md:mb-8"
              >
                {errorMessage}
              </p>
            ) : null}
            <div className="border-t border-line-soft lg:px-8 lg:py-6">
              <BottomActionBar>
                <button
                  form="google-onboarding-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-base font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? t("completing") : t("completeRegistration")}
                  <ArrowRightIcon className="size-4" />
                </button>
              </BottomActionBar>
            </div>
          </form>
        </PageContainer>
      </main>
    </div>
  );
}
