import {
  ACTIVITY_CREATE_STEPS,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type PhotoDraft,
} from "./activity-create-wizard";

const DATABASE_NAME = "hanbuddy-activity-drafts";
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "drafts";
const STORAGE_VERSION = 1;
const SESSION_KEY_PREFIX = "hanbuddy:activity-create-draft";

export interface ActivityCreateDraftSnapshot {
  currentStep: ActivityCreateStep;
  furthestStepIndex: number;
  draft: ActivityCreateDraft;
  errorKey: ActivityCreateErrorKey | null;
  reviewing: boolean;
  fileSequence: number;
  scheduleSequence: number;
}

export interface RestoredActivityCreateDraft {
  snapshot: ActivityCreateDraftSnapshot;
  objectUrls: Set<string>;
}

interface StoredPhotoDraft extends Omit<PhotoDraft, "previewUrl"> {
  previewUrl: string | null;
}

interface StoredActivityCreateDraft extends Omit<ActivityCreateDraft, "photos" | "itinerary"> {
  photos: StoredPhotoDraft[];
  itinerary: Array<
    Omit<ActivityCreateDraft["itinerary"][number], "photo"> & {
      photo: StoredPhotoDraft | null;
    }
  >;
}

interface StoredActivityCreateDraftSnapshot extends Omit<ActivityCreateDraftSnapshot, "draft"> {
  draft: StoredActivityCreateDraft;
}

interface ActivityCreateDraftRecord {
  id: string;
  scope: string;
  version: typeof STORAGE_VERSION;
  snapshot: StoredActivityCreateDraftSnapshot;
}

let writeQueue: Promise<void> = Promise.resolve();

function canPersistDraft() {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.indexedDB !== "undefined" &&
      typeof window.sessionStorage !== "undefined"
    );
  } catch {
    return false;
  }
}

function getSessionKey(scope: string) {
  return `${SESSION_KEY_PREFIX}:${scope}`;
}

function createRecordId(scope: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${scope}:${randomId}`;
}

function getRecordId(scope: string) {
  if (!canPersistDraft()) return null;
  return window.sessionStorage.getItem(getSessionKey(scope));
}

function getOrCreateRecordId(scope: string) {
  const existingId = getRecordId(scope);
  if (existingId) return existingId;

  const id = createRecordId(scope);
  window.sessionStorage.setItem(getSessionKey(scope), id);
  return id;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        database.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE_NAME, mode);
        const request = operation(transaction.objectStore(OBJECT_STORE_NAME));
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

function enqueueWrite(operation: () => Promise<void>) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

function storePhoto(photo: PhotoDraft): StoredPhotoDraft {
  return {
    id: photo.id,
    file: photo.file,
    existingKey: photo.existingKey,
    // blob: URL은 새 문서에서 유효하지 않으므로 File과 함께 저장하지 않는다.
    previewUrl: photo.file ? null : photo.previewUrl,
  };
}

function storeSnapshot(snapshot: ActivityCreateDraftSnapshot): StoredActivityCreateDraftSnapshot {
  return {
    ...snapshot,
    draft: {
      ...snapshot.draft,
      photos: snapshot.draft.photos.map(storePhoto),
      itinerary: snapshot.draft.itinerary.map((item) => ({
        ...item,
        photo: item.photo ? storePhoto(item.photo) : null,
      })),
    },
  };
}

function isRecord(value: unknown): value is ActivityCreateDraftRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ActivityCreateDraftRecord>;
  const snapshot = record.snapshot as Partial<StoredActivityCreateDraftSnapshot> | undefined;
  return (
    record.version === STORAGE_VERSION &&
    typeof record.id === "string" &&
    typeof record.scope === "string" &&
    Boolean(snapshot) &&
    ACTIVITY_CREATE_STEPS.some((step) => step === snapshot?.currentStep) &&
    typeof snapshot?.furthestStepIndex === "number" &&
    Boolean(snapshot?.draft) &&
    Array.isArray(snapshot?.draft?.photos) &&
    Array.isArray(snapshot?.draft?.itinerary) &&
    Array.isArray(snapshot?.draft?.schedules)
  );
}

function restorePhoto(photo: StoredPhotoDraft, objectUrls: Set<string>): PhotoDraft {
  if (photo.file) {
    const previewUrl = URL.createObjectURL(photo.file);
    objectUrls.add(previewUrl);
    return { ...photo, previewUrl };
  }
  if (!photo.previewUrl) throw new Error("Stored activity photo has no preview source.");
  return { ...photo, previewUrl: photo.previewUrl };
}

function restoreSnapshot(snapshot: StoredActivityCreateDraftSnapshot): RestoredActivityCreateDraft {
  const objectUrls = new Set<string>();
  try {
    return {
      snapshot: {
        ...snapshot,
        draft: {
          ...snapshot.draft,
          photos: snapshot.draft.photos.map((photo) => restorePhoto(photo, objectUrls)),
          itinerary: snapshot.draft.itinerary.map((item) => ({
            ...item,
            photo: item.photo ? restorePhoto(item.photo, objectUrls) : null,
          })),
        },
      },
      objectUrls,
    };
  } catch (error) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

export function getActivityCreateDraftScope(mode: "create" | "edit", activityId?: string) {
  return mode === "edit" ? `edit:${activityId ?? "unknown"}` : "create";
}

export async function saveActivityCreateDraft(
  scope: string,
  snapshot: ActivityCreateDraftSnapshot,
) {
  if (!canPersistDraft()) return;
  const id = getOrCreateRecordId(scope);
  const record: ActivityCreateDraftRecord = {
    id,
    scope,
    version: STORAGE_VERSION,
    snapshot: storeSnapshot(snapshot),
  };

  await enqueueWrite(async () => {
    await runTransaction("readwrite", (store) => store.put(record));
  });
}

export async function loadActivityCreateDraft(
  scope: string,
): Promise<RestoredActivityCreateDraft | null> {
  const id = getRecordId(scope);
  if (!id) return null;

  try {
    const record = await runTransaction<unknown>("readonly", (store) => store.get(id));
    if (!isRecord(record) || record.scope !== scope) {
      await clearActivityCreateDraft(scope);
      return null;
    }
    return restoreSnapshot(record.snapshot);
  } catch {
    await clearActivityCreateDraft(scope);
    return null;
  }
}

export async function clearActivityCreateDraft(scope: string) {
  const id = getRecordId(scope);
  if (!canPersistDraft()) return;
  window.sessionStorage.removeItem(getSessionKey(scope));
  if (!id) return;

  await enqueueWrite(async () => {
    await runTransaction("readwrite", (store) => store.delete(id));
  }).catch(() => undefined);
}
