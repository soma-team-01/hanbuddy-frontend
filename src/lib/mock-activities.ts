import type { Activity } from "@/types/activity";

/** 서버 API 연동 전까지 사용하는 목 데이터 */
export const mockActivities: Activity[] = [
  {
    id: "tea-ceremony",
    title: "Traditional Tea Ceremony in Hanok",
    location: "Bukchon Hanok Village",
    imageUrl: "/images/activities/tea-ceremony.jpg",
    rating: 4.9,
    price: 35000,
    categories: ["popular", "cultural"],
    host: {
      name: "Jihoon K.",
      role: "Local Guide",
      avatarUrl: "/images/avatars/jihoon.jpg",
    },
  },
  {
    id: "gwangjang-market",
    title: "Gwangjang Night Market Tasting Tour",
    location: "Jongno-gu",
    imageUrl: "/images/activities/gwangjang-market.jpg",
    rating: 4.8,
    price: 45000,
    categories: ["nearby", "popular", "food"],
    host: {
      name: "Minji P.",
      role: "Foodie Expert",
      avatarUrl: "/images/avatars/minji.jpg",
    },
  },
];
