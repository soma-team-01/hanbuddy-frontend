import type { MyProfile } from "@/types/user";

export function createMockProfile(overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    userId: 1,
    email: "user@example.com",
    name: "Sarah Jenkins",
    displayName: "Sarah",
    userType: "TOURIST",
    profileImageKey: "profiles/2026/07/06/uuid.webp",
    profileImageUrl:
      "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/profiles/2026/07/06/uuid.webp",
    nationalityCode: "US",
    birthDate: "1998-04-12",
    contactMethod: "LINE",
    contactCountryCode: "+1",
    contactIdentifier: "555-0198",
    ...overrides,
  };
}
