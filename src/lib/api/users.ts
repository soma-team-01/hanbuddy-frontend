import type { ApiResponse, ErrorApiResponse } from "@/lib/auth/types";
import type { MyProfile, MyProfileUpdateRequest } from "@/types/user";
import { fetchWithAuthRetry } from "./client";

export type MyProfileResult =
  | { status: "success"; profile: MyProfile }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const DEFAULT_PROFILE_ERROR_MESSAGE = "프로필을 불러오지 못했습니다.";

export async function getMyProfile(): Promise<MyProfileResult> {
  return requestMyProfile("/api/users/me");
}

export async function updateMyProfile(request: MyProfileUpdateRequest): Promise<MyProfileResult> {
  return requestMyProfile("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

async function requestMyProfile(path: string, init?: RequestInit): Promise<MyProfileResult> {
  let response: Response;
  try {
    response = await fetchWithAuthRetry(path, init);
  } catch {
    return { status: "error", message: DEFAULT_PROFILE_ERROR_MESSAGE };
  }

  if (response.status === 401) return { status: "unauthenticated" };

  const payload = (await response.json().catch(() => null)) as
    ApiResponse<MyProfile> | ErrorApiResponse | null;

  if (!payload || !payload.isSuccess) {
    return { status: "error", message: payload?.message ?? DEFAULT_PROFILE_ERROR_MESSAGE };
  }

  return { status: "success", profile: payload.result };
}
