import type { ApiResponse, ErrorApiResponse } from "@/lib/auth/types";
import { createApiClientError } from "@/lib/api/errors";

export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageContentType = (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_SIZE_ERROR_MESSAGE = "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.";
/** 백엔드 presigned 발급 한도와 동일 (ACTIVITY 목적, 요청당 최대 10장) */
export const MAX_ACTIVITY_IMAGE_COUNT = 10;
/** 채팅 이미지 발급 한도 (CHAT 목적, 요청당 최대 9장) */
export const MAX_CHAT_IMAGE_COUNT = 9;
export const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_SIZE_ERROR_MESSAGE = "사진은 10MB 이하만 보낼 수 있습니다.";

const PRESIGNED_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_S3_UPLOAD_TIMEOUT_SECONDS = 300;
const MAX_S3_UPLOAD_TIMEOUT_SECONDS = 30;
const PROFILE_UPLOAD_TIMEOUT_ERROR_MESSAGE =
  "프로필 이미지 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.";
const ACTIVITY_UPLOAD_TIMEOUT_ERROR_MESSAGE =
  "활동 이미지 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.";

export type ImageUploadPurpose = "PROFILE" | "ACTIVITY" | "CHAT";

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

/** presigned 발급 응답 본문 — 성공/실패 어느 쪽이든 올 수 있다 */
type PresignedResponseBody = ApiResponse<PresignedImageUploadResult> | ErrorApiResponse;

export function isSupportedProfileImageType(type: string): type is ProfileImageContentType {
  return (PROFILE_IMAGE_CONTENT_TYPES as readonly string[]).includes(type);
}

/**
 * 조회 응답의 imageUrl에서 업로드 시 발급된 S3 key를 복원한다.
 * presigned 발급 계약상 imageUrl 경로가 곧 imageKey다 (예: https://cdn/activities/a.webp -> activities/a.webp).
 */
export function extractImageKeyFromUrl(imageUrl: string): string {
  try {
    const { pathname } = new URL(imageUrl);
    return decodeURIComponent(pathname.replace(/^\//, ""));
  } catch {
    // 상대 경로도 절대 URL과 동일하게 디코딩해 같은 key를 돌려준다
    const path = imageUrl.replace(/^\//, "");
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }
}

function isRequestTimeoutError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

async function fetchWithTimeoutMessage(input: string, init: RequestInit, timeoutMessage: string) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new Error(timeoutMessage);
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

  const presignedResponse = await fetchWithTimeoutMessage(
    "/api/images/presigned-urls",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(PRESIGNED_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        purpose: "PROFILE",
        contentType: file.type,
        imageCount: 1,
      } satisfies PresignedImageUploadRequest),
    },
    PROFILE_UPLOAD_TIMEOUT_ERROR_MESSAGE,
  );
  const presignedBody = (await presignedResponse.json().catch(() => undefined)) as
    PresignedResponseBody | undefined;

  if (!presignedResponse.ok || !presignedBody?.isSuccess) {
    throw createApiClientError(
      presignedResponse.status,
      presignedBody?.isSuccess === false ? presignedBody : null,
      "프로필 이미지 업로드 URL을 발급받지 못했습니다.",
    );
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
  const s3Response = await fetchWithTimeoutMessage(
    uploadTarget.uploadUrl,
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      signal: AbortSignal.timeout(s3TimeoutSeconds * 1000),
      body: file,
    },
    PROFILE_UPLOAD_TIMEOUT_ERROR_MESSAGE,
  );

  if (!s3Response.ok) {
    throw new Error("프로필 이미지 업로드에 실패했습니다.");
  }

  return uploadTarget;
}

export async function uploadActivityImages(files: File[]): Promise<PresignedImageItem[]> {
  if (files.length === 0) {
    throw new Error("활동 이미지를 선택해 주세요.");
  }
  if (files.length > MAX_ACTIVITY_IMAGE_COUNT) {
    throw new Error(`활동 이미지는 최대 ${MAX_ACTIVITY_IMAGE_COUNT}장까지 업로드할 수 있습니다.`);
  }

  const contentType = files[0]?.type ?? "";
  if (!isSupportedProfileImageType(contentType)) {
    throw new Error("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
  }
  if (!files.every((file) => file.type === contentType)) {
    throw new Error("한 번에 업로드하는 활동 이미지는 같은 파일 형식이어야 합니다.");
  }

  const presignedResponse = await fetchWithTimeoutMessage(
    "/api/images/presigned-urls",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(PRESIGNED_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        purpose: "ACTIVITY",
        contentType,
        imageCount: files.length,
      } satisfies PresignedImageUploadRequest),
    },
    ACTIVITY_UPLOAD_TIMEOUT_ERROR_MESSAGE,
  );
  const presignedBody = (await presignedResponse.json().catch(() => undefined)) as
    PresignedResponseBody | undefined;

  if (!presignedResponse.ok || !presignedBody?.isSuccess) {
    throw createApiClientError(
      presignedResponse.status,
      presignedBody?.isSuccess === false ? presignedBody : null,
      "활동 이미지 업로드 URL을 발급받지 못했습니다.",
    );
  }

  const uploadTargets = presignedBody.result.images;
  if (uploadTargets.length !== files.length) {
    throw new Error("활동 이미지 업로드 URL을 발급받지 못했습니다.");
  }

  await Promise.all(
    uploadTargets.map(async (uploadTarget, index) => {
      const file = files[index];
      const s3TimeoutSeconds = Math.min(
        uploadTarget.expiresInSeconds || DEFAULT_S3_UPLOAD_TIMEOUT_SECONDS,
        MAX_S3_UPLOAD_TIMEOUT_SECONDS,
      );
      const s3Response = await fetchWithTimeoutMessage(
        uploadTarget.uploadUrl,
        {
          method: "PUT",
          headers: { "Content-Type": file.type },
          signal: AbortSignal.timeout(s3TimeoutSeconds * 1000),
          body: file,
        },
        ACTIVITY_UPLOAD_TIMEOUT_ERROR_MESSAGE,
      );

      if (!s3Response.ok) {
        throw new Error("활동 이미지 업로드에 실패했습니다.");
      }
    }),
  );

  return uploadTargets;
}

/**
 * 갤러리 사진과 일정표 사진처럼 형식이 섞이거나 10장을 넘는 활동 이미지 묶음을 업로드한다.
 * Presigned 발급은 contentType 단위·요청당 최대 10장이므로 형식별로 묶어 10장씩 나눠 발급하고,
 * 결과는 입력 파일 순서 그대로 반환한다.
 */
export async function uploadActivityImageSet(files: File[]): Promise<PresignedImageItem[]> {
  if (files.length === 0) {
    throw new Error("활동 이미지를 선택해 주세요.");
  }
  for (const file of files) {
    if (!isSupportedProfileImageType(file.type)) {
      throw new Error("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
    }
  }

  const indexesByContentType = new Map<string, number[]>();
  files.forEach((file, index) => {
    const indexes = indexesByContentType.get(file.type) ?? [];
    indexes.push(index);
    indexesByContentType.set(file.type, indexes);
  });

  const results = new Array<PresignedImageItem>(files.length);
  for (const indexes of indexesByContentType.values()) {
    for (let start = 0; start < indexes.length; start += MAX_ACTIVITY_IMAGE_COUNT) {
      const chunk = indexes.slice(start, start + MAX_ACTIVITY_IMAGE_COUNT);
      const uploaded = await uploadActivityImages(chunk.map((index) => files[index]));
      chunk.forEach((originalIndex, position) => {
        results[originalIndex] = uploaded[position];
      });
    }
  }
  return results;
}

const CHAT_UPLOAD_TIMEOUT_ERROR_MESSAGE =
  "사진 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 채팅에 보낼 사진을 업로드하고 발급받은 key를 돌려준다.
 * 발급 후 1시간 안에 전송해야 하므로, 보내기 직전에 호출한다.
 */
export async function uploadChatImages(files: File[]): Promise<PresignedImageItem[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_CHAT_IMAGE_COUNT) {
    throw new Error(`사진은 한 번에 ${MAX_CHAT_IMAGE_COUNT}장까지 보낼 수 있습니다.`);
  }

  const contentType = files[0].type;
  if (!isSupportedProfileImageType(contentType)) {
    throw new Error("JPEG, PNG, WebP 형식의 이미지만 보낼 수 있습니다.");
  }
  // presigned는 요청당 contentType이 하나라 형식이 섞이면 나눠 올려야 한다
  if (files.some((file) => file.type !== contentType)) {
    throw new Error("같은 형식의 사진끼리 보내 주세요.");
  }
  if (files.some((file) => file.size > MAX_CHAT_IMAGE_BYTES)) {
    throw new Error(CHAT_IMAGE_SIZE_ERROR_MESSAGE);
  }

  const presignedResponse = await fetchWithTimeoutMessage(
    "/api/images/presigned-urls",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(PRESIGNED_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        purpose: "CHAT",
        contentType,
        imageCount: files.length,
      } satisfies PresignedImageUploadRequest),
    },
    CHAT_UPLOAD_TIMEOUT_ERROR_MESSAGE,
  );
  const presignedBody = (await presignedResponse.json().catch(() => undefined)) as
    PresignedResponseBody | undefined;

  if (!presignedResponse.ok || !presignedBody?.isSuccess) {
    throw createApiClientError(
      presignedResponse.status,
      presignedBody?.isSuccess === false ? presignedBody : null,
      "사진 업로드 URL을 발급받지 못했습니다.",
    );
  }

  const targets = presignedBody.result.images.slice(0, files.length);
  if (targets.length !== files.length) {
    throw new Error("사진 업로드 URL을 발급받지 못했습니다.");
  }

  await Promise.all(
    targets.map(async (target, index) => {
      const s3TimeoutSeconds = Math.min(
        target.expiresInSeconds || DEFAULT_S3_UPLOAD_TIMEOUT_SECONDS,
        MAX_S3_UPLOAD_TIMEOUT_SECONDS,
      );
      const s3Response = await fetchWithTimeoutMessage(
        target.uploadUrl,
        {
          method: "PUT",
          headers: { "Content-Type": contentType },
          signal: AbortSignal.timeout(s3TimeoutSeconds * 1000),
          body: files[index],
        },
        CHAT_UPLOAD_TIMEOUT_ERROR_MESSAGE,
      );
      if (!s3Response.ok) throw new Error("사진 업로드에 실패했습니다.");
    }),
  );

  return targets;
}
