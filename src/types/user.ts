import type { ContactMethod, UserType } from "@/lib/auth/types";

export interface MyProfileUpdateRequest {
  name: string;
  /** 유지하려면 기존 key, 제거하려면 null/빈 값 */
  profileImageKey?: string | null;
  nationalityCode: string;
  age: number;
  contactMethod: ContactMethod;
  contactCountryCode?: string | null;
  contactIdentifier: string;
}

export interface MyProfile {
  userId: number;
  email: string;
  name: string;
  userType: UserType;
  profileImageKey: string | null;
  profileImageUrl: string | null;
  nationalityCode: string;
  age: number;
  contactMethod: ContactMethod;
  contactCountryCode: string | null;
  contactIdentifier: string;
}
