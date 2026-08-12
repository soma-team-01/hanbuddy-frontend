import {
  ACTIVITY_CREATE_STEPS,
  type ActivityCreateDraft,
  type ActivityCreateErrorKey,
  type ActivityCreateStep,
  type PhotoDraft,
} from "./activity-create-wizard";

const DATABASE_NAME = "hanbuddy-activity-drafts";
const DATABASE_VERSION = 2;
const DRAFT_STORE_NAME = "drafts";
const PHOTO_STORE_NAME = "draft-photos";
const STORAGE_VERSION = 2;
const SESSION_KEY_PREFIX = "hanbuddy:activity-create-draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

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

interface StoredPhotoDraft extends Omit<PhotoDraft, "file" | "previewUrl"> {
  fileId: string | null;
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
  updatedAt: number;
  photoFileIds: string[];
  snapshot: StoredActivityCreateDraftSnapshot;
}

interface ActivityCreatePhotoRecord {
  id: string;
  file: File;
}

type StoreMap = Record<string, IDBObjectStore>;

let writeQueue: Promise<void> = Promise.resolve();
let lastPrunedAt = 0;

function toError(reason: unknown, message: string) {
  if (reason instanceof Error) return reason;
  return new Error(message, reason === undefined ? undefined : { cause: reason });
}

function canPersistDraft() {
  try {
    return (
      globalThis.window !== undefined &&
      globalThis.window.indexedDB !== undefined &&
      globalThis.window.sessionStorage !== undefined &&
      globalThis.crypto?.randomUUID !== undefined
    );
  } catch {
    return false;
  }
}

function getSessionKey(scope: string) {
  return `${SESSION_KEY_PREFIX}:${scope}`;
}

function createRecordId(scope: string) {
  return `${scope}:${globalThis.crypto.randomUUID()}`;
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

function pruneExpiredDrafts(database: IDBDatabase) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([DRAFT_STORE_NAME, PHOTO_STORE_NAME], "readwrite");
    const draftStore = transaction.objectStore(DRAFT_STORE_NAME);
    const photoStore = transaction.objectStore(PHOTO_STORE_NAME);
    const request = draftStore.getAll();

    request.onsuccess = () => {
      const expiresBefore = Date.now() - DRAFT_TTL_MS;
      for (const candidate of request.result as Array<Partial<ActivityCreateDraftRecord>>) {
        if (typeof candidate.updatedAt === "number" && candidate.updatedAt >= expiresBefore) {
          continue;
        }
        if (typeof candidate.id === "string") draftStore.delete(candidate.id);
        if (Array.isArray(candidate.photoFileIds)) {
          candidate.photoFileIds.forEach((photoId) => photoStore.delete(photoId));
        }
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(toError(transaction.error, "Failed to prune expired activity drafts."));
    transaction.onabort = () =>
      reject(toError(transaction.error, "Activity draft pruning was aborted."));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () =>
      reject(toError(request.error, "Failed to open the activity draft database."));
    request.onblocked = () => reject(new Error("The activity draft database upgrade is blocked."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        database.createObjectStore(DRAFT_STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        database.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = async () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      try {
        if (Date.now() - lastPrunedAt >= PRUNE_INTERVAL_MS) {
          await pruneExpiredDrafts(database);
          lastPrunedAt = Date.now();
        }
        resolve(database);
      } catch (error) {
        database.close();
        reject(toError(error, "Failed to initialize the activity draft database."));
      }
    };
  });
}

async function runTransaction<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  operation: (stores: StoreMap, setResult: (value: T) => void) => void,
) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    const stores = Object.fromEntries(
      storeNames.map((storeName) => [storeName, transaction.objectStore(storeName)]),
    );
    let result: T;

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(toError(transaction.error, "Activity draft transaction failed."));
    };
    transaction.onabort = () => {
      database.close();
      reject(toError(transaction.error, "Activity draft transaction was aborted."));
    };

    try {
      operation(stores, (value) => {
        result = value;
      });
    } catch (error) {
      transaction.abort();
      reject(toError(error, "Failed to start the activity draft transaction."));
    }
  });
}

function enqueueWrite(operation: () => Promise<void>) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

function storePhoto(photo: PhotoDraft): StoredPhotoDraft {
  return {
    id: photo.id,
    fileId: photo.file ? photo.id : null,
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

function collectPhotoRecords(snapshot: ActivityCreateDraftSnapshot) {
  const photos = [
    ...snapshot.draft.photos,
    ...snapshot.draft.itinerary.flatMap((item) => (item.photo ? [item.photo] : [])),
  ];
  return photos.flatMap<ActivityCreatePhotoRecord>((photo) =>
    photo.file ? [{ id: photo.id, file: photo.file }] : [],
  );
}

function haveSameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function isActivityCreateDraftRecord(value: unknown): value is ActivityCreateDraftRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ActivityCreateDraftRecord>;
  const snapshot = record.snapshot as Partial<StoredActivityCreateDraftSnapshot> | undefined;
  return (
    record.version === STORAGE_VERSION &&
    typeof record.id === "string" &&
    typeof record.scope === "string" &&
    typeof record.updatedAt === "number" &&
    Array.isArray(record.photoFileIds) &&
    Boolean(snapshot) &&
    ACTIVITY_CREATE_STEPS.includes(snapshot?.currentStep as ActivityCreateStep) &&
    typeof snapshot?.furthestStepIndex === "number" &&
    Boolean(snapshot?.draft) &&
    Array.isArray(snapshot?.draft?.photos) &&
    Array.isArray(snapshot?.draft?.itinerary) &&
    Array.isArray(snapshot?.draft?.schedules)
  );
}

function restorePhoto(
  photo: StoredPhotoDraft,
  files: Map<string, File>,
  objectUrls: Set<string>,
): PhotoDraft {
  const file = photo.fileId ? files.get(photo.fileId) : null;
  if (photo.fileId && !file) throw new Error("Stored activity photo file is missing.");
  if (file) {
    const previewUrl = URL.createObjectURL(file);
    objectUrls.add(previewUrl);
    return { id: photo.id, file, existingKey: photo.existingKey, previewUrl };
  }
  if (!photo.previewUrl) throw new Error("Stored activity photo has no preview source.");
  return {
    id: photo.id,
    file: null,
    existingKey: photo.existingKey,
    previewUrl: photo.previewUrl,
  };
}

function restoreSnapshot(
  snapshot: StoredActivityCreateDraftSnapshot,
  files: Map<string, File>,
): RestoredActivityCreateDraft {
  const objectUrls = new Set<string>();
  try {
    return {
      snapshot: {
        ...snapshot,
        draft: {
          ...snapshot.draft,
          photos: snapshot.draft.photos.map((photo) => restorePhoto(photo, files, objectUrls)),
          itinerary: snapshot.draft.itinerary.map((item) => ({
            ...item,
            photo: item.photo ? restorePhoto(item.photo, files, objectUrls) : null,
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

function readDraftRecord(id: string) {
  return runTransaction<ActivityCreateDraftRecord | undefined>(
    [DRAFT_STORE_NAME],
    "readonly",
    (stores, setResult) => {
      const request = stores[DRAFT_STORE_NAME].get(id);
      request.onsuccess = () => setResult(request.result as ActivityCreateDraftRecord | undefined);
    },
  );
}

function readPhotoFiles(ids: string[]) {
  const files = new Map<string, File>();
  return runTransaction<Map<string, File>>([PHOTO_STORE_NAME], "readonly", (stores, setResult) => {
    setResult(files);
    for (const id of ids) {
      const request = stores[PHOTO_STORE_NAME].get(id);
      request.onsuccess = () => {
        const record = request.result as ActivityCreatePhotoRecord | undefined;
        if (record?.file) files.set(record.id, record.file);
      };
    }
  });
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
  const photoRecords = collectPhotoRecords(snapshot);
  const photoFileIds = photoRecords.map((photo) => photo.id);
  const record: ActivityCreateDraftRecord = {
    id,
    scope,
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    photoFileIds,
    snapshot: storeSnapshot(snapshot),
  };

  await enqueueWrite(() =>
    runTransaction<void>([DRAFT_STORE_NAME, PHOTO_STORE_NAME], "readwrite", (stores) => {
      const draftStore = stores[DRAFT_STORE_NAME];
      const photoStore = stores[PHOTO_STORE_NAME];
      const request = draftStore.get(id);
      request.onsuccess = () => {
        const previous = request.result as ActivityCreateDraftRecord | undefined;
        const previousPhotoIds = previous?.photoFileIds ?? [];
        if (!haveSameIds(previousPhotoIds, photoFileIds)) {
          const nextPhotoIds = new Set(photoFileIds);
          previousPhotoIds
            .filter((photoId) => !nextPhotoIds.has(photoId))
            .forEach((photoId) => photoStore.delete(photoId));
          const previousIds = new Set(previousPhotoIds);
          photoRecords
            .filter((photo) => !previousIds.has(photo.id))
            .forEach((photo) => photoStore.put(photo));
        }
        draftStore.put(record);
      };
    }),
  );
}

export async function loadActivityCreateDraft(
  scope: string,
): Promise<RestoredActivityCreateDraft | null> {
  const id = getRecordId(scope);
  if (!id) return null;

  try {
    const record = await readDraftRecord(id);
    if (!isActivityCreateDraftRecord(record) || record.scope !== scope) {
      await clearActivityCreateDraft(scope);
      return null;
    }
    const files = await readPhotoFiles(record.photoFileIds);
    return restoreSnapshot(record.snapshot, files);
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

  await enqueueWrite(() =>
    runTransaction<void>([DRAFT_STORE_NAME, PHOTO_STORE_NAME], "readwrite", (stores) => {
      const draftStore = stores[DRAFT_STORE_NAME];
      const photoStore = stores[PHOTO_STORE_NAME];
      const request = draftStore.get(id);
      request.onsuccess = () => {
        const record = request.result as ActivityCreateDraftRecord | undefined;
        record?.photoFileIds?.forEach((photoId) => photoStore.delete(photoId));
        draftStore.delete(id);
      };
    }),
  ).catch(() => undefined);
}
