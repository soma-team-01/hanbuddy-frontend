import type { ContactMethod, UserType } from "@/lib/auth/types";

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
