"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CountrySelect } from "@/components/ui/CountrySelect";
import {
  APP_BY_CONTACT_METHOD,
  CONTACT_METHOD_BY_APP,
  MessagingAppField,
  type MessagingAppKey,
} from "@/components/ui/MessagingAppField";
import { PencilIcon } from "@/components/ui/icons";
import { updateMyProfile } from "@/lib/api/users";
import { COUNTRIES, findCountry } from "@/lib/countries";
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
  const [messagingApp, setMessagingApp] = useState<MessagingAppKey>(
    APP_BY_CONTACT_METHOD[profile.contactMethod],
  );
  const [messagingContact, setMessagingContact] = useState(profile.contactIdentifier);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange } =
    useMessagingCountrySync(profile.nationalityCode, toMessagingCountry(profile));

  const isBuddy = profile.userType === "BUDDY";

  function handleMessagingAppChange(key: MessagingAppKey) {
    setMessagingApp(key);
    // 전화번호형 <-> ID형 값이 섞이지 않도록 앱 전환 시 연락처 입력을 비운다
    setMessagingContact("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const age = Number(formData.get("age"));
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
      const result = await updateMyProfile({
        name,
        profileImageKey: profile.profileImageKey,
        nationalityCode: nationality,
        age,
        contactMethod: CONTACT_METHOD_BY_APP[messagingApp],
        contactCountryCode:
          isBuddy && (messagingApp === "whatsapp" || messagingApp === "phone")
            ? "+82"
            : (findCountry(messagingCountry)?.dialCode ?? ""),
        contactIdentifier,
      });

      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      router.replace("/my-page");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopAppBar
        backHref="/my-page"
        action={
          <button
            form="edit-profile-form"
            type="submit"
            disabled={isSaving}
            className="font-display text-sm font-semibold text-forest disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        }
      />
      <form id="edit-profile-form" onSubmit={handleSubmit} className="contents">
        <main className="flex flex-1 flex-col gap-8 px-4 py-8">
          <section className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar name={profile.name} src={profile.profileImageUrl} size={112} />
              <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-forest text-cream">
                <PencilIcon className="size-4" />
              </span>
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
