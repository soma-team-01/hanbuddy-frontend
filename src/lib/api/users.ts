import type { MyProfile, MyProfileUpdateRequest } from "@/types/user";
import { type ApiResult, requestApiResult } from "./result";

export type MyProfileResult = ApiResult<MyProfile, "profile">;

const DEFAULT_PROFILE_ERROR_MESSAGE = "프로필을 불러오지 못했습니다.";
const DEFAULT_PROFILE_SAVE_ERROR_MESSAGE = "프로필을 저장하지 못했습니다.";

export function getMyProfile() {
  return requestApiResult<MyProfile, "profile">(
    "/api/users/me",
    "profile",
    undefined,
    DEFAULT_PROFILE_ERROR_MESSAGE,
  );
}

export function updateMyProfile(request: MyProfileUpdateRequest) {
  return requestApiResult<MyProfile, "profile">(
    "/api/users/me",
    "profile",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_PROFILE_SAVE_ERROR_MESSAGE,
  );
}
