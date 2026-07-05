import type { Activity } from "@/types/activity";

/** 서버 API 연동 전까지 사용하는 목 데이터 */
export const mockActivities: Activity[] = [
  {
    id: "tea-ceremony",
    title: "Traditional Tea Ceremony & Hanok Walk",
    description:
      "Step away from the bustling city and immerse yourself in the tranquility of a traditional Korean tea ceremony.",
    location: "Bukchon Hanok Village",
    district: "Jongno-gu, Seoul",
    categoryLabel: "Art One-day Class",
    imageUrl: "/images/activities/tea-ceremony.jpg",
    heroImageUrl: "/images/activities/tea-ceremony.jpg",
    rating: 4.9,
    reviewCount: 18,
    price: 35000,
    host: {
      name: "Jihoon K.",
      bio: "Local guide living in Seoul, Korea",
      avatarUrl: "/images/avatars/jihoon.jpg",
    },
    included: [
      { label: "2 types of traditional tea & refreshments", provided: true },
      { label: "Hanok Village walking tour", provided: true },
      { label: "Professional guide commentary", provided: true },
      { label: "Transportation not provided", provided: false },
    ],
    restrictions: ["People with mobility difficulties", "Wheelchair users"],
    sessions: [
      { id: "s1", dateLabel: "July 5th (Friday)", timeLabel: "1:00 PM", spotsLeft: 4 },
      { id: "s2", dateLabel: "July 6th (Saturday)", timeLabel: "1:00 PM - 4:00 PM", spotsLeft: 2 },
      { id: "s3", dateLabel: "July 12th (Friday)", timeLabel: "1:00 PM - 4:00 PM", spotsLeft: 6 },
    ],
    meetingPoint: {
      name: "Bukchon Hanok Village",
      area: "Jongno-gu, Seoul",
      mapImageUrl: "/images/map-bukchon.jpg",
    },
  },
  {
    id: "bukchon-hidden-gems",
    title: "Bukchon Hidden Gems",
    description:
      "Wander beyond the crowds and discover quiet alleys, artisan workshops, and rooftop views of the Hanok village.",
    location: "Bukchon Hanok Village",
    district: "Jongno-gu, Seoul",
    categoryLabel: "Walking Tour",
    imageUrl: "/images/activities/hanok-hero.jpg",
    heroImageUrl: "/images/activities/hanok-hero.jpg",
    rating: 4.9,
    reviewCount: 128,
    price: 50000,
    originalPrice: 65000,
    host: {
      name: "Harry",
      bio: "Canadian living in Seoul, Korea",
      avatarUrl: "/images/avatars/harry.jpg",
    },
    included: [
      { label: "Guided alley walk with photo spots", provided: true },
      { label: "Traditional snack tasting", provided: true },
      { label: "Transportation not provided", provided: false },
    ],
    restrictions: ["People with mobility difficulties"],
    sessions: [
      { id: "s1", dateLabel: "July 8th (Monday)", timeLabel: "10:00 AM", spotsLeft: 5 },
      { id: "s2", dateLabel: "July 13th (Saturday)", timeLabel: "2:00 PM - 5:00 PM", spotsLeft: 3 },
    ],
    meetingPoint: {
      name: "Bukchon Hanok Village",
      area: "Jongno-gu, Seoul",
      mapImageUrl: "/images/map-bukchon.jpg",
    },
  },
  {
    id: "gwangjang-market",
    title: "Gwangjang Night Market Tasting Tour",
    description:
      "Navigate the bustling alleys of Seoul's oldest market and taste authentic street food with a local foodie.",
    location: "Jongno-gu",
    district: "Jongno-gu, Seoul",
    categoryLabel: "Food Tour",
    imageUrl: "/images/activities/gwangjang-market.jpg",
    heroImageUrl: "/images/activities/gwangjang-market.jpg",
    rating: 4.8,
    reviewCount: 42,
    price: 45000,
    host: {
      name: "Minji P.",
      bio: "Foodie expert born and raised in Seoul",
      avatarUrl: "/images/avatars/minji.jpg",
    },
    included: [
      { label: "6+ street food tastings", provided: true },
      { label: "Market history commentary", provided: true },
      { label: "Drinks not included", provided: false },
    ],
    restrictions: ["Severe food allergies"],
    sessions: [
      { id: "s1", dateLabel: "July 5th (Friday)", timeLabel: "6:00 PM", spotsLeft: 4 },
      { id: "s2", dateLabel: "July 6th (Saturday)", timeLabel: "6:00 PM - 9:00 PM", spotsLeft: 2 },
    ],
    meetingPoint: {
      name: "Gwangjang Market East Gate",
      area: "Jongno-gu, Seoul",
      mapImageUrl: "/images/map-bukchon.jpg",
    },
  },
];

export function findActivity(id: string): Activity | undefined {
  return mockActivities.find((activity) => activity.id === id);
}
