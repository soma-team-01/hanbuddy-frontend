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
  UserType,
} from "@/lib/auth/types";

const ROLES = ["TOURIST", "BUDDY"] as const;

type OnboardingValidationErrorKey = keyof (typeof messages)["Onboarding"]["validation"];
type OnboardingErrorKey =
  | `validation.${OnboardingValidationErrorKey}`
  | "profileUploadFailed"
  | "signupFailed"
  | "serverUnavailable";

interface OnboardingFormProps {
  googleProfile?: GoogleProfile;
}

export function OnboardingForm({ googleProfile }: Readonly<OnboardingFormProps>) {
  const t = useTranslations("Onboarding");
  const getApiErrorMessage = useApiErrorMessage();
  const router = useRouter();
  const [role, setRole] = useState<UserType>("TOURIST");
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

  function handleRoleChange(nextRole: UserType) {
    setRole(nextRole);
    // 국가별 번호 <-> 한국 로컬 번호로 값 의미가 달라지므로 역할 전환 시 연락처를 비운다
    setMessagingContact("");
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
    const ageEntry = formData.get("age");
    const age = typeof ageEntry === "string" && ageEntry.trim() ? Number(ageEntry) : Number.NaN;
    const contactIdentifier = messagingContact.trim();

    if (!nationality) {
      setErrorKey("validation.nationalityRequired");
      return;
    }
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      setErrorKey("validation.ageInvalid");
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
        userType: role,
        ...(profileImageKey ? { profileImageKey } : {}),
        nationalityCode: nationality,
        age,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode:
          role === "BUDDY" && (messagingApp === "whatsapp" || messagingApp === "phone")
            ? "+82"
            : (findCountry(messagingCountry)?.dialCode ?? ""),
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

      const userType = body.result.userType ?? role;
      router.replace(userType === "BUDDY" ? "/dashboard" : "/explore");
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
    <div className="flex flex-1 flex-col bg-canvas pb-28 lg:pb-0">
      <PageHeader title={t("title")} closeHref="/login" />
      <main className="flex-1 py-6 md:py-10">
        <PageContainer className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
          <aside className="mb-8 hidden lg:block">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              Getting started
            </p>
            <h2 className="mt-5 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em]">
              {t("title")}
            </h2>
            <ol className="mt-12 flex flex-col gap-5 text-sm text-muted">
              {["Choose your role", "Personal info", "How buddies reach you"].map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full font-display font-bold ${index === 0 ? "bg-primary text-white" : "border border-line-strong"}`}
                  >
                    {index + 1}
                  </span>
                  <span className="pt-1 font-semibold">{step}</span>
                </li>
              ))}
            </ol>
          </aside>
          <form
            id="google-onboarding-form"
            aria-label={t("title")}
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto grid w-full max-w-[800px] gap-8 md:grid-cols-2"
          >
            <section className="flex flex-col items-center gap-3 md:col-span-2">
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
              {(googleProfile?.name || googleProfile?.email) && (
                <div className="text-center">
                  {googleProfile.name && (
                    <p className="font-display text-lg font-semibold text-ink">
                      {googleProfile.name}
                    </p>
                  )}
                  {googleProfile.email && (
                    <p className="text-sm text-muted">{googleProfile.email}</p>
                  )}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 md:col-span-2">
              <h2 className="font-display text-xl font-semibold text-ink">{t("roleHeading")}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {ROLES.map((key) => {
                  const isSelected = role === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleRoleChange(key)}
                      className={`h-24 rounded-2xl border px-5 text-left font-display text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-primary bg-primary-soft text-primary-strong shadow-[0_8px_20px_rgba(209,63,50,0.12)]"
                          : "border-line-soft bg-canvas-soft text-ink hover:border-primary-soft"
                      }`}
                    >
                      {t(key === "TOURIST" ? "roles.tourist" : "roles.buddy")}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-4 border-t border-line-soft pt-8 md:col-span-2">
              <h2 className="font-display text-xl font-semibold text-ink">
                {t("personalInformation")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted">{t("nationality")}</span>
                  <CountrySelect
                    value={nationality}
                    onChange={handleNationalityChange}
                    ariaLabel={t("nationality")}
                  />
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-muted">{t("age")}</span>
                  <input
                    name="age"
                    type="number"
                    min={0}
                    max={150}
                    required
                    placeholder={t("agePlaceholder")}
                    className="w-full rounded-xl border border-line-soft bg-panel px-4 py-3.5 text-base text-ink placeholder:text-muted/70"
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-4 border-t border-line-soft pt-8 md:col-span-2">
              <h2 className="font-display text-xl font-semibold text-ink">{t("contactMethods")}</h2>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted">{t("preferredMessagingApp")}</span>
                <MessagingAppField
                  app={messagingApp}
                  onAppChange={handleMessagingAppChange}
                  country={messagingCountry}
                  onCountryChange={handleMessagingCountryChange}
                  contactValue={messagingContact}
                  onContactChange={setMessagingContact}
                  inputName="contactIdentifier"
                  inputRequired
                  koreanOnly={role === "BUDDY"}
                />
              </div>
            </section>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger md:col-span-2"
              >
                {errorMessage}
              </p>
            ) : null}
            <div className="md:col-span-2">
              <BottomActionBar>
                <button
                  form="google-onboarding-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-base font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
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
