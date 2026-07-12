"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  APP_BY_CONTACT_METHOD,
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { CameraIcon } from "@/components/ui/icons";
import { updateMyProfile } from "@/lib/api/users";
import { COUNTRIES, findCountry } from "@/lib/countries";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_CONTENT_TYPES,
  PROFILE_IMAGE_SIZE_ERROR_MESSAGE,
  isSupportedProfileImageType,
  uploadProfileImage,
} from "@/lib/images/presigned";
import { UnauthenticatedQueryError, unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { userKeys } from "@/lib/query/users";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";
import type { MyProfile } from "@/types/user";

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

interface EditProfileFormProps {
  profile: MyProfile;
}

export function EditProfileForm({ profile }: Readonly<EditProfileFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>(
    APP_BY_CONTACT_METHOD[profile.contactMethod],
  );
  const [messagingContact, setMessagingContact] = useState(profile.contactIdentifier);
  const [errorMessage, setErrorMessage] = useState("");
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
      router.replace("/my-page");
    },
  });
  useAuthQueryRedirect(updateProfileMutation.error);

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isSupportedProfileImageType(file.type)) {
      setErrorMessage("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setErrorMessage(PROFILE_IMAGE_SIZE_ERROR_MESSAGE);
      event.target.value = "";
      return;
    }

    setErrorMessage("");
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
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const nameEntry = formData.get("name");
    const ageEntry = formData.get("age");
    const name = typeof nameEntry === "string" ? nameEntry.trim() : "";
    const age = typeof ageEntry === "string" ? Number(ageEntry) : Number.NaN;
    const contactIdentifier = messagingContact.trim();

    if (!name) {
      setErrorMessage("이름을 입력해 주세요.");
      return;
    }
    if (!nationality) {
      setErrorMessage("Nationality를 선택해 주세요.");
      return;
    }
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      setErrorMessage("Age는 0에서 150 사이의 숫자로 입력해 주세요.");
      return;
    }
    if (contactIdentifier.length < 2) {
      setErrorMessage("연락처 ID 또는 번호를 2자 이상 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      let profileImageKey: string | null;
      try {
        profileImageKey = await resolveProfileImageKey();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "프로필 이미지 업로드에 실패했습니다.",
        );
        return;
      }

      await updateProfileMutation.mutateAsync({
        name,
        profileImageKey,
        nationalityCode: nationality,
        age,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode:
          isBuddy && (messagingApp === "whatsapp" || messagingApp === "phone")
            ? "+82"
            : (findCountry(messagingCountry)?.dialCode ?? ""),
        contactIdentifier,
      });
    } catch (error) {
      if (error instanceof UnauthenticatedQueryError) return;
      setErrorMessage(
        error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const profilePhoto = profileImagePreview ? (
    <Image
      src={profileImagePreview}
      alt="Selected profile photo preview"
      width={112}
      height={112}
      unoptimized
      className="size-28 shrink-0 rounded-full border border-line-strong object-cover"
    />
  ) : (
    <Avatar name={profile.name} src={profile.profileImageUrl} size={112} />
  );

  return (
    <div className="flex flex-1 flex-col">
      <TopAppBar
        backHref="/my-page"
        action={
          <button
            form="edit-profile-form"
            type="submit"
            disabled={isSaving}
            className="font-display text-sm font-semibold text-forest enabled:hover:underline disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        }
      />
      <form id="edit-profile-form" onSubmit={handleSubmit} className="contents">
        <main className="flex flex-1 flex-col gap-8 px-4 py-8">
          <section className="flex flex-col items-center gap-3">
            <div className="relative">
              {profilePhoto}
              <label className="absolute -right-2 -bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-forest text-cream transition-colors hover:bg-forest-soft">
                <CameraIcon className="size-4" />
                <span className="sr-only">Add profile photo</span>
                <input
                  type="file"
                  accept={PROFILE_IMAGE_CONTENT_TYPES.join(",")}
                  className="sr-only"
                  onChange={handleProfileImageChange}
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Full Name</span>
              <input
                name="name"
                type="text"
                required
                defaultValue={profile.name}
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
              />
            </label>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">Nationality</span>
                <CountrySelect
                  value={nationality}
                  onChange={handleNationalityChange}
                  ariaLabel="Nationality"
                />
              </div>
              <label className="col-span-2 flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">Age</span>
                <input
                  name="age"
                  type="number"
                  min={0}
                  max={150}
                  required
                  defaultValue={profile.age}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Contact Details</h2>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Preferred Messaging App</span>
              <MessagingAppField
                app={messagingApp}
                onAppChange={handleMessagingAppChange}
                country={messagingCountry}
                onCountryChange={handleMessagingCountryChange}
                contactValue={messagingContact}
                onContactChange={setMessagingContact}
                inputRequired
                koreanOnly={isBuddy}
              />
            </div>
          </section>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {errorMessage}
            </p>
          )}
        </main>
      </form>
    </div>
  );
}
