import { describe, expect, it } from "vitest";
import { EMPTY_ACTIVITY_DRAFT } from "./activity-create-wizard";
import {
  getActivityCreateDraftScope,
  isActivityCreateDraftRecord,
} from "./activity-create-draft-storage";

const validRecord = {
  id: "create:record-id",
  scope: "create",
  version: 2,
  updatedAt: Date.now(),
  photoFileIds: [],
  snapshot: {
    currentStep: "host",
    furthestStepIndex: 0,
    draft: EMPTY_ACTIVITY_DRAFT,
    errorKey: null,
    reviewing: false,
    fileSequence: 0,
    scheduleSequence: 0,
  },
};

describe("activity create draft storage", () => {
  it("separates creation and activity edit draft scopes", () => {
    expect(getActivityCreateDraftScope("create")).toBe("create");
    expect(getActivityCreateDraftScope("edit", "42")).toBe("edit:42");
  });

  it("accepts a current activity draft record", () => {
    expect(isActivityCreateDraftRecord(validRecord)).toBe(true);
  });

  it("rejects unsupported versions and corrupted snapshots", () => {
    expect(isActivityCreateDraftRecord({ ...validRecord, version: 1 })).toBe(false);
    expect(
      isActivityCreateDraftRecord({
        ...validRecord,
        snapshot: { ...validRecord.snapshot, currentStep: "unknown" },
      }),
    ).toBe(false);
    expect(
      isActivityCreateDraftRecord({
        ...validRecord,
        snapshot: { ...validRecord.snapshot, draft: { ...EMPTY_ACTIVITY_DRAFT, photos: null } },
      }),
    ).toBe(false);
  });
});
