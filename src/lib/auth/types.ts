export type UserType = "TOURIST" | "BUDDY";
export type ContactMethod = "WHATSAPP" | "LINE" | "WECHAT" | "PHONE";

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
}

export interface AccessTokenResponse {
  accessToken: string;
}
