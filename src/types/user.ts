import type { ContactMethod, UserType } from "@/lib/auth/types";

export interface MyProfileUpdateRequest {
  displayName: string;
  /** 유지하려면 기존 key, 제거하려면 null/빈 값 */
  profileImageKey?: string | null;
  nationalityCode: string;
  birthDate: string;
  contactMethod: ContactMethod;
  contactCountryCode?: string | null;
  contactIdentifier: string;
}

export interface MyProfile {
  userId: number;
  email: string;
  name: string;
  displayName: string;
  userType: UserType;
  profileImageKey: string | null;
  profileImageUrl: string | null;
  nationalityCode: string;
  birthDate: string;
  contactMethod: ContactMethod;
  contactCountryCode: string | null;
  contactIdentifier: string;
}
