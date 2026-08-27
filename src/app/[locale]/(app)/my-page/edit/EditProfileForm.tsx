"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  APP_BY_CONTACT_METHOD,
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { CameraIcon, MailIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useMyProfile } from "@/lib/api/useMyProfile";
import { updateMyProfile } from "@/lib/api/users";
import { COUNTRIES, findCountry } from "@/lib/countries";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_CONTENT_TYPES,
  isSupportedProfileImageType,
  uploadProfileImage,
} from "@/lib/images/presigned";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { userKeys } from "@/lib/query/users";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";
import type messages from "@/messages/en.json";
import type { MyProfile } from "@/types/user";

function getLocalDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

type ProfileValidationErrorKey = keyof (typeof messages)["Profile"]["validation"];
type ProfileErrorKey =
  `validation.${ProfileValidationErrorKey}` | "profileUploadFailed" | "saveFailed";

/** 저장된 연락처 국가 번호(+1 등)를 국가 선택용 alpha-2 코드로 되돌린다 */
function toMessagingCountry(profile: MyProfile) {
  const { nationalityCode, contactCountryCode } = profile;
  if (!contactCountryCode) return nationalityCode || "US";
  if (findCountry(nationalityCode)?.dialCode === contactCountryCode) return nationalityCode;
  return (
    COUNTRIES.find((country) => country.dialCode === contactCountryCode)?.code ||
    nationalityCode ||
    "US"
  );
}

function resolveContactCountryCode(
  isBuddy: boolean,
  messagingApp: MessagingAppKey,
  messagingCountry: string,
) {
  const usesKoreanPhoneNumber =
    isBuddy && (messagingApp === "whatsapp" || messagingApp === "phone");
  return usesKoreanPhoneNumber ? "+82" : (findCountry(messagingCountry)?.dialCode ?? "");
}

interface EditProfileFormProps {
  profile: MyProfile;
}

export function EditProfileForm({ profile }: Readonly<EditProfileFormProps>) {
  const t = useTranslations("Profile");
  const getApiErrorMessage = useApiErrorMessage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>(
    APP_BY_CONTACT_METHOD[profile.contactMethod],
  );
  const [messagingContact, setMessagingContact] = useState(profile.contactIdentifier);
  const [errorKey, setErrorKey] = useState<ProfileErrorKey | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    error: unknown;
    fallbackKey: Extract<ProfileErrorKey, "profileUploadFailed" | "saveFailed">;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  // 같은 파일로 재제출할 때(프로필 저장 요청만 실패한 경우) S3 업로드를 반복하지 않기 위한 캐시
  const uploadedProfileImageRef = useRef<{ file: File; imageKey: string } | null>(null);
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync(profile.nationalityCode, toMessagingCountry(profile));

  const isBuddy = profile.userType === "BUDDY";
  const updateProfileMutation = useMutation({
    mutationFn: async (request: Parameters<typeof updateMyProfile>[0]) =>
      unwrapApiResult(await updateMyProfile(request), "profile"),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(userKeys.me(), updatedProfile);
      router.replace("/my-page/profile");
    },
  });
  useAuthQueryRedirect(
    updateProfileMutation.error ??
      (requestFailure?.error instanceof Error ? requestFailure.error : null),
  );

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

  function handleMessagingAppChange(key: MessagingAppKey) {
    setMessagingApp(key);
    // 전화번호형 <-> ID형 값이 섞이지 않도록 앱 전환 시 연락처 입력을 비운다
    setMessagingContact("");
  }

  async function resolveProfileImageKey(): Promise<string | null> {
    if (!profileImageFile) return profile.profileImageKey;
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
    const birthDateEntry = formData.get("birthDate");
    const rawDisplayName = typeof displayNameEntry === "string" ? displayNameEntry : "";
    const displayName = rawDisplayName.trim();
    const birthDate = typeof birthDateEntry === "string" ? birthDateEntry.trim() : "";
    const contactIdentifier = messagingContact.trim();

    if (displayName.length < 2 || displayName.length > 30 || displayName !== rawDisplayName) {
      setErrorKey("validation.nameRequired");
      return;
    }
    if (!nationality) {
      setErrorKey("validation.nationalityRequired");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > getLocalDateInputValue(new Date())) {
      setErrorKey("validation.ageInvalid");
      return;
    }
    if (contactIdentifier.length < 2) {
      setErrorKey("validation.contactInvalid");
      return;
    }

    setIsSaving(true);
    try {
      let profileImageKey: string | null;
      try {
        profileImageKey = await resolveProfileImageKey();
      } catch (error) {
        setRequestFailure({ error, fallbackKey: "profileUploadFailed" });
        return;
      }

      await updateProfileMutation.mutateAsync({
        displayName,
        profileImageKey,
        nationalityCode: nationality,
        birthDate,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode: resolveContactCountryCode(isBuddy, messagingApp, messagingCountry),
        contactIdentifier,
      });
    } catch (error) {
      if (error instanceof UnauthenticatedQueryError) return;
      setRequestFailure({ error, fallbackKey: "saveFailed" });
    } finally {
      setIsSaving(false);
    }
  }

  const profilePhoto = profileImagePreview ? (
    <Image
      src={profileImagePreview}
      alt={t("selectedProfilePhotoPreview")}
      width={112}
      height={112}
      unoptimized
      className="size-28 shrink-0 rounded-full border border-line-strong object-cover ring-1 ring-line-soft ring-offset-5 ring-offset-white"
    />
  ) : (
    <Avatar
      name={profile.displayName}
      src={profile.profileImageUrl}
      size={112}
      className="ring-1 ring-line-soft ring-offset-5 ring-offset-white"
    />
  );
  let errorMessage: string | null = null;
  if (requestFailure) {
    errorMessage = getApiErrorMessage(requestFailure.error, t(requestFailure.fallbackKey));
  } else if (errorKey) {
    errorMessage = t(errorKey);
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={t("title")}
        backHref="/my-page/profile"
        compact
        action={
          <button
            form="edit-profile-form"
            type="submit"
            disabled={isSaving}
            className="hidden rounded-lg px-3 py-2 font-display text-sm font-bold text-primary-strong enabled:hover:bg-primary-soft disabled:opacity-60 lg:block"
          >
            {isSaving ? t("saving") : t("save")}
          </button>
        }
      />
      <main className="flex-1 py-4 md:py-6">
        <PageContainer>
          <form
            id="edit-profile-form"
            aria-label={t("title")}
            noValidate
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[900px] rounded-[2rem] border border-line-soft bg-white px-5 py-6 shadow-[0_20px_55px_rgba(38,27,24,0.08)] sm:px-7 lg:px-8"
          >
            <div
              data-testid="edit-profile-layout"
              className="grid gap-7 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8"
            >
              <section className="flex items-center gap-5 lg:flex-col lg:pt-2 lg:text-center">
                <div className="relative">
                  {profilePhoto}
                  <label className="absolute -right-2 -bottom-2 flex size-9 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-white text-primary-strong shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary-strong focus-within:ring-offset-2 hover:border-primary hover:text-primary">
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
                <p className="flex min-w-0 items-center gap-2 text-sm break-all text-muted lg:justify-center">
                  <MailIcon aria-hidden className="size-4 shrink-0" />
                  {profile.email}
                </p>
              </section>

              <div className="min-w-0">
                <section aria-labelledby="profile-fields-title">
                  <h2
                    id="profile-fields-title"
                    className="font-display text-lg font-bold tracking-tight text-ink"
                  >
                    {t("viewDetails")}
                  </h2>

                  <label className="mt-4 flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">{t("fullName")}</span>
                    <input
                      name="displayName"
                      type="text"
                      required
                      minLength={2}
                      maxLength={30}
                      defaultValue={profile.displayName}
                      className="w-full rounded-xl border border-line-strong bg-white px-4 py-2.5 text-base text-ink transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{t("nationality")}</span>
                      <CountrySelect
                        value={nationality}
                        onChange={handleNationalityChange}
                        ariaLabel={t("nationality")}
                        triggerClassName="flex w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-white px-4 py-2.5 text-base text-ink outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                      />
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink">{t("age")}</span>
                      <input
                        name="birthDate"
                        type="date"
                        max={getLocalDateInputValue(new Date())}
                        required
                        defaultValue={profile.birthDate}
                        className="w-full rounded-xl border border-line-strong bg-white px-4 py-2.5 text-base text-ink transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                </section>

                <section className="mt-5 flex flex-col gap-3 border-t border-line-soft pt-5">
                  <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                    {t("contactDetails")}
                  </h2>
                  <div className="flex flex-col gap-2">
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
                      inputRequired
                      koreanOnly={isBuddy}
                      variant="cards"
                    />
                  </div>
                </section>

                {errorMessage ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
                  >
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </form>
          <div className="mx-auto mt-6 w-full max-w-[900px] lg:hidden">
            <BottomActionBar>
              <button
                form="edit-profile-form"
                type="submit"
                disabled={isSaving}
                aria-label={t("saveOnMobile")}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
              >
                {isSaving ? t("saving") : t("save")}
              </button>
            </BottomActionBar>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}

export function EditProfilePageContent() {
  const t = useTranslations("Profile");
  const getApiErrorMessage = useApiErrorMessage();
  const result = useMyProfile();

  if (result?.status === "success") {
    return <EditProfileForm profile={result.profile} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={t("title")} backHref="/my-page/profile" compact />
      <PageContainer className="flex flex-1 flex-col items-center gap-4 py-4 md:py-6">
        {result?.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {getApiErrorMessage(result.error, t("loadFailed"))}
          </p>
        ) : (
          <>
            <span aria-hidden className="size-28 animate-pulse rounded-full bg-panel-raised" />
            <span aria-hidden className="h-6 w-40 animate-pulse rounded bg-panel-raised" />
          </>
        )}
      </PageContainer>
    </div>
  );
}
