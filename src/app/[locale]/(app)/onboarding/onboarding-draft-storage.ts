import type { MessagingAppKey } from "@/components/ui/MessagingAppField";
import type { SignupAgreementType, UserType } from "@/lib/auth/types";

const STORAGE_KEY_PREFIX = "hanbuddy:onboarding-draft";
const STORAGE_VERSION = 1;
const DRAFT_TTL_MS = 30 * 60 * 1000;
const MESSAGING_APPS = ["whatsapp", "line", "wechat", "phone", "kakaotalk", "instagram"] as const;

export interface OnboardingDraftSnapshot {
  currentStep: 1 | 2 | 3;
  displayName: string;
  birthDate: string;
  nationality: string;
  messagingApp: MessagingAppKey;
  messagingCountry: string;
  messagingContact: string;
  agreementDecisions: Partial<Record<SignupAgreementType, boolean>>;
  profileImageFile: File | null;
  existingProfileImageKey: string | null;
  existingProfileImageUrl: string | null;
}

interface StoredOnboardingDraft {
  version: typeof STORAGE_VERSION;
  updatedAt: number;
  snapshot: Omit<OnboardingDraftSnapshot, "profileImageFile">;
}

const memoryDrafts = new Map<string, { updatedAt: number; snapshot: OnboardingDraftSnapshot }>();

function getStorageKey(scope: string) {
  return `${STORAGE_KEY_PREFIX}:${scope}`;
}

function canUseSessionStorage() {
  try {
    return globalThis.window !== undefined && globalThis.window.sessionStorage !== undefined;
  } catch {
    return false;
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isAgreementDecisions(
  value: unknown,
): value is Partial<Record<SignupAgreementType, boolean>> {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.values(value).every((decision) => typeof decision === "boolean")
  );
}

function isStoredOnboardingDraft(value: unknown): value is StoredOnboardingDraft {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredOnboardingDraft>;
  const snapshot = record.snapshot as Partial<StoredOnboardingDraft["snapshot"]> | undefined;

  return (
    record.version === STORAGE_VERSION &&
    typeof record.updatedAt === "number" &&
    Date.now() - record.updatedAt <= DRAFT_TTL_MS &&
    Boolean(snapshot) &&
    (snapshot?.currentStep === 1 || snapshot?.currentStep === 2 || snapshot?.currentStep === 3) &&
    typeof snapshot?.displayName === "string" &&
    typeof snapshot.birthDate === "string" &&
    typeof snapshot.nationality === "string" &&
    MESSAGING_APPS.some((app) => app === snapshot.messagingApp) &&
    typeof snapshot.messagingCountry === "string" &&
    typeof snapshot.messagingContact === "string" &&
    isAgreementDecisions(snapshot.agreementDecisions) &&
    isNullableString(snapshot.existingProfileImageKey) &&
    isNullableString(snapshot.existingProfileImageUrl)
  );
}

function getStoredDraftUpdatedAt(raw: string) {
  try {
    const stored: unknown = JSON.parse(raw);
    if (stored === null || typeof stored !== "object") return null;
    const updatedAt = (stored as Partial<StoredOnboardingDraft>).updatedAt;
    return typeof updatedAt === "number" ? updatedAt : null;
  } catch {
    return null;
  }
}

export function getOnboardingDraftScope({
  userType,
  signupDraftAccountId,
  resubmissionUserId,
  reviewedAt,
}: Readonly<{
  userType: UserType;
  signupDraftAccountId?: string;
  resubmissionUserId?: number;
  reviewedAt?: string | null;
}>) {
  if (resubmissionUserId !== undefined) {
    return `resubmission:${resubmissionUserId}:${reviewedAt ?? "unreviewed"}`;
  }

  const normalizedAccountId = signupDraftAccountId?.trim();
  return normalizedAccountId
    ? `signup:${userType}:${encodeURIComponent(normalizedAccountId)}`
    : null;
}

export function getOnboardingMemoryDraft(scope: string) {
  const record = memoryDrafts.get(scope);
  if (!record) return null;
  if (Date.now() - record.updatedAt > DRAFT_TTL_MS) {
    memoryDrafts.delete(scope);
    return null;
  }
  return record.snapshot;
}

export async function loadOnboardingDraft(scope: string): Promise<OnboardingDraftSnapshot | null> {
  const memoryDraft = getOnboardingMemoryDraft(scope);
  if (memoryDraft) return memoryDraft;
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(scope));
    if (!raw) return null;
    const stored: unknown = JSON.parse(raw);
    if (!isStoredOnboardingDraft(stored)) {
      window.sessionStorage.removeItem(getStorageKey(scope));
      return null;
    }

    const restored = { ...stored.snapshot, profileImageFile: null };
    memoryDrafts.set(scope, { updatedAt: stored.updatedAt, snapshot: restored });
    return restored;
  } catch {
    try {
      window.sessionStorage.removeItem(getStorageKey(scope));
    } catch {
      // 브라우저가 sessionStorage 접근을 차단한 경우 메모리 초안만 사용한다.
    }
    return null;
  }
}

export function saveOnboardingDraft(scope: string, snapshot: OnboardingDraftSnapshot) {
  const updatedAt = Date.now();
  memoryDrafts.set(scope, { updatedAt, snapshot });
  if (!canUseSessionStorage()) return;

  const { profileImageFile: _profileImageFile, ...serializableSnapshot } = snapshot;
  void _profileImageFile;
  const stored: StoredOnboardingDraft = {
    version: STORAGE_VERSION,
    updatedAt,
    snapshot: serializableSnapshot,
  };
  try {
    window.sessionStorage.setItem(getStorageKey(scope), JSON.stringify(stored));
  } catch {
    // sessionStorage가 차단되거나 용량이 부족해도 현재 화면의 작성 상태는 유지한다.
  }
}

export function clearOnboardingDraft(scope: string) {
  memoryDrafts.delete(scope);
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(getStorageKey(scope));
  } catch {
    // 메모리 초안은 이미 제거되었으므로 별도 오류를 노출하지 않는다.
  }
}

export function clearAllOnboardingDrafts() {
  memoryDrafts.clear();
  if (!canUseSessionStorage()) return;

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // 메모리 초안은 이미 제거되었으므로 별도 오류를 노출하지 않는다.
  }
}

export function clearSignupOnboardingDrafts() {
  for (const scope of memoryDrafts.keys()) {
    if (scope.startsWith("signup:")) memoryDrafts.delete(scope);
  }
  if (!canUseSessionStorage()) return;

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(`${STORAGE_KEY_PREFIX}:signup:`)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // 메모리 초안은 이미 제거되었으므로 별도 오류를 노출하지 않는다.
  }
}

export function clearExpiredOnboardingDrafts(now = Date.now()) {
  for (const [scope, record] of memoryDrafts) {
    if (now - record.updatedAt > DRAFT_TTL_MS) memoryDrafts.delete(scope);
  }
  if (!canUseSessionStorage()) return;

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (!key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) continue;

      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      const updatedAt = getStoredDraftUpdatedAt(raw);
      if (updatedAt !== null && now - updatedAt > DRAFT_TTL_MS) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // sessionStorage 접근이 차단되어도 메모리의 만료 초안은 이미 제거되었다.
  }
}
