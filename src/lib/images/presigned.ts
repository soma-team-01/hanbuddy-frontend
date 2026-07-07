import type { ApiResponse, ErrorApiResponse } from "@/lib/auth/types";

export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageContentType = (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_SIZE_ERROR_MESSAGE = "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.";

const PRESIGNED_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_S3_UPLOAD_TIMEOUT_SECONDS = 300;
const MAX_S3_UPLOAD_TIMEOUT_SECONDS = 30;
const UPLOAD_TIMEOUT_ERROR_MESSAGE =
  "프로필 이미지 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.";

export type ImageUploadPurpose = "PROFILE";

export interface PresignedImageUploadRequest {
  purpose: ImageUploadPurpose;
  contentType: ProfileImageContentType;
  imageCount: number;
}

export interface PresignedImageItem {
  uploadUrl: string;
  imageKey: string;
  imageUrl: string;
  expiresInSeconds: number;
}

export interface PresignedImageUploadResult {
  images: PresignedImageItem[];
}

export function isSupportedProfileImageType(type: string): type is ProfileImageContentType {
  return (PROFILE_IMAGE_CONTENT_TYPES as readonly string[]).includes(type);
}

function isRequestTimeoutError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

async function fetchWithTimeoutMessage(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new Error(UPLOAD_TIMEOUT_ERROR_MESSAGE);
    }
    throw error;
  }
}

export async function uploadProfileImage(file: File): Promise<PresignedImageItem> {
  if (!isSupportedProfileImageType(file.type)) {
    throw new Error("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(PROFILE_IMAGE_SIZE_ERROR_MESSAGE);
  }

  const presignedResponse = await fetchWithTimeoutMessage("/api/images/presigned-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(PRESIGNED_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      purpose: "PROFILE",
      contentType: file.type,
      imageCount: 1,
    } satisfies PresignedImageUploadRequest),
  });
  const presignedBody = (await presignedResponse.json().catch(() => undefined)) as
    ApiResponse<PresignedImageUploadResult> | ErrorApiResponse | undefined;

  if (!presignedResponse.ok || !presignedBody?.isSuccess) {
    throw new Error(presignedBody?.message ?? "프로필 이미지 업로드 URL을 발급받지 못했습니다.");
  }

  const uploadTarget = presignedBody.result.images.at(0);
  if (!uploadTarget) {
    throw new Error("프로필 이미지 업로드 URL을 발급받지 못했습니다.");
  }

  // S3 PUT은 발급 시 전달한 contentType과 동일한 Content-Type 헤더를 요구한다.
  // Presigned URL 유효 시간을 넘기지 않되, 클라이언트 대기 시간은 30초로 제한한다.
  const s3TimeoutSeconds = Math.min(
    uploadTarget.expiresInSeconds || DEFAULT_S3_UPLOAD_TIMEOUT_SECONDS,
    MAX_S3_UPLOAD_TIMEOUT_SECONDS,
  );
  const s3Response = await fetchWithTimeoutMessage(uploadTarget.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    signal: AbortSignal.timeout(s3TimeoutSeconds * 1000),
    body: file,
  });

  if (!s3Response.ok) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }

  return uploadTarget;
}
