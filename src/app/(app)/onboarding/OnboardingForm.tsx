"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MessagingAppField, type MessagingAppKey } from "@/components/ui/MessagingAppField";
import { ArrowRightIcon, CameraIcon, UserIcon } from "@/components/ui/icons";
import { findCountry } from "@/lib/countries";
import {
  PROFILE_IMAGE_CONTENT_TYPES,
  isSupportedProfileImageType,
  uploadProfileImage,
} from "@/lib/images/presigned";
import { useMessagingCountrySync } from "@/lib/useMessagingCountrySync";
import type {
  ApiResponse,
  ContactMethod,
  ErrorApiResponse,
  GoogleLoginResponse,
  GoogleProfile,
  GoogleSignupRequest,
  UserType,
} from "@/lib/auth/types";

const ROLES = [
  { key: "TOURIST", label: "Tourist" },
  { key: "BUDDY", label: "Buddy" },
] as const;

const CONTACT_METHOD_BY_APP: Record<MessagingAppKey, ContactMethod> = {
  whatsapp: "WHATSAPP",
  line: "LINE",
  wechat: "WECHAT",
  phone: "PHONE",
};

interface OnboardingFormProps {
  googleProfile?: GoogleProfile;
}

export function OnboardingForm({ googleProfile }: Readonly<OnboardingFormProps>) {
  const router = useRouter();
  const [role, setRole] = useState<UserType>("TOURIST");
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>("line");
  const [messagingContact, setMessagingContact] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
      setErrorMessage("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    setErrorMessage("");
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
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const age = Number(formData.get("age"));
    const contactIdentifier = messagingContact.trim();

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

    setIsSubmitting(true);
    try {
      let profileImageKey: string | undefined;
      try {
        profileImageKey = await resolveProfileImageKey();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "프로필 이미지 업로드에 실패했습니다.",
        );
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
        setErrorMessage(body?.message ?? "회원가입을 완료할 수 없습니다.");
        return;
      }

      const userType = body.result.userType ?? role;
      router.replace(userType === "BUDDY" ? "/dashboard" : "/explore");
    } catch {
      setErrorMessage("인증 서버에 연결할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  let profilePhoto = (
    <div className="flex size-24 items-center justify-center rounded-2xl border border-line bg-sand">
      <UserIcon className="size-9 text-ink-soft" />
    </div>
  );
  if (profileImagePreview) {
    profilePhoto = (
      <Image
        src={profileImagePreview}
        alt="Selected profile photo preview"
        width={96}
        height={96}
        unoptimized
        className="size-24 rounded-2xl border border-line object-cover"
      />
    );
  } else if (googleProfile?.picture) {
    profilePhoto = (
      <Image
        src={googleProfile.picture}
        alt={googleProfile.name ? `${googleProfile.name} profile` : "Google profile"}
        width={96}
        height={96}
        className="size-24 rounded-2xl border border-line object-cover"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar closeHref="/login" />
      <form id="google-onboarding-form" onSubmit={handleSubmit} className="contents">
        <main className="flex flex-1 flex-col gap-8 px-4 py-8">
          <section className="flex flex-col items-center gap-3">
            <div className="relative">
              {profilePhoto}
              <label className="absolute -right-2 -bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-forest text-cream">
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
            {(googleProfile?.name || googleProfile?.email) && (
              <div className="text-center">
                {googleProfile.name && (
                  <p className="font-display text-lg font-semibold text-ink">
                    {googleProfile.name}
                  </p>
                )}
                {googleProfile.email && (
                  <p className="text-sm text-ink-soft">{googleProfile.email}</p>
                )}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">I am a...</h2>
            <div className="flex overflow-hidden rounded-lg border border-line-strong">
              {ROLES.map(({ key, label }) => {
                const isSelected = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleRoleChange(key)}
                    className={`h-12 flex-1 font-display text-sm font-semibold ${
                      isSelected ? "bg-forest text-cream" : "bg-white text-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px w-full bg-line" aria-hidden />

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Personal Information</h2>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-ink-soft">Nationality</span>
              <CountrySelect
                value={nationality}
                onChange={handleNationalityChange}
                ariaLabel="Nationality"
              />
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-ink-soft">Age</span>
              <input
                name="age"
                type="number"
                min={0}
                max={150}
                required
                placeholder="e.g. 25"
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
              />
            </label>
          </section>

          <div className="h-px w-full bg-line" aria-hidden />

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">Contact Methods</h2>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-ink-soft">Preferred Messaging App</span>
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
      <BottomActionBar>
        <button
          form="google-onboarding-form"
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest font-display text-base font-semibold text-cream disabled:opacity-60"
        >
          {isSubmitting ? "Completing..." : "Complete Registration"}
          <ArrowRightIcon className="size-4" />
        </button>
      </BottomActionBar>
    </div>
  );
}
