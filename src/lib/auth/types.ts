export type UserType = "TOURIST" | "BUDDY";
export type ContactMethod = "WHATSAPP" | "LINE" | "WECHAT" | "PHONE";
export type SignupAgreementType =
  | "ADULT_CONFIRMATION"
  | "TERMS_OF_SERVICE"
  | "PRIVACY_COLLECTION_USE"
  | "BUDDY_OPERATION_TERMS"
  | "BUDDY_COMMISSION_POLICY"
  | "BUDDY_PROFILE_CONTACT_PROVISION"
  | "MARKETING_COMMUNICATION";
export type AuthStatus =
  "ONBOARDING_REQUIRED" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface ApiResponse<T> {
  isSuccess: true;
  code: string;
  message: string;
  result: T;
}

export interface ErrorApiResponse {
  isSuccess: false;
  code: string;
  message: string;
  result?: unknown;
}

export interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleLoginResponse {
  registered: boolean;
  authStatus: AuthStatus;
  statusReason?: string;
  userId?: number;
  userType?: UserType;
  accessToken?: string;
  signupToken?: string;
  googleProfile?: GoogleProfile;
}

export interface GoogleSignupRequest {
  userType: UserType;
  displayName: string;
  profileImageKey?: string;
  nationalityCode: string;
  birthDate: string;
  contactMethod: ContactMethod;
  contactCountryCode?: string;
  contactIdentifier: string;
  agreements: SignupAgreementRequest[];
}

export interface SignupAgreementRequest {
  type: SignupAgreementType;
  version: string;
  agreed: boolean;
}

export interface AccessTokenResponse {
  accessToken: string;
}
