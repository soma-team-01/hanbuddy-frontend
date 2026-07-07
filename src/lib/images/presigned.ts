import type { ApiResponse, ErrorApiResponse } from "@/lib/auth/types";

export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageContentType = (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

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

export async function uploadProfileImage(file: File): Promise<PresignedImageItem> {
  if (!isSupportedProfileImageType(file.type)) {
    throw new Error("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
  }

  const presignedResponse = await fetch("/api/images/presigned-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  // S3 PUT은 발급 시 전달한 contentType과 동일한 Content-Type 헤더를 요구한다
  const s3Response = await fetch(uploadTarget.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!s3Response.ok) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }

  return uploadTarget;
}
