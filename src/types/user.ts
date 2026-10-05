import type { ContactMethod, UserType } from "@/lib/auth/types";
import type { BankName } from "@/lib/auth/signup-extra";

export interface ProfileBankAccount {
  bank: BankName | null;
  bankCode: string | null;
  bankName: string;
  accountNumber: string;
}

export interface MyProfileUpdateRequest {
  displayName: string;
  /** 유지하려면 기존 key, 제거하려면 null/빈 값 */
  profileImageKey?: string | null;
  nationalityCode: string;
  birthDate: string;
  contactMethod: ContactMethod;
  contactCountryCode?: string | null;
  contactIdentifier: string;
  /** 버디만 변경할 때 두 필드를 함께 전송. 생략하면 기존 계좌 유지. */
  bankName?: BankName | null;
  bankAccountNumber?: string | null;
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
  /** 본인 전용. 이전 서버 응답과의 호환을 위해 누락도 허용한다. */
  bankAccount?: ProfileBankAccount | null;
}
