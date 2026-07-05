import type { Application } from "@/types/application";

/** 서버 API 연동 전까지 사용하는 목 데이터 */
export const mockApplications: Application[] = [
  {
    id: "app-1",
    status: "pending_payment",
    dateLabel: "Oct 24, 2023",
    hostName: "Jihoon Kim",
    hostAvatarUrl: "/images/avatars/jihoon.jpg",
    activityTitle: "Gyeongbokgung Palace Tour & Tea",
  },
  {
    id: "app-2",
    status: "confirmed",
    dateLabel: "Nov 02, 2023",
    hostName: "Minji Lee",
    hostAvatarUrl: "/images/avatars/minji.jpg",
    activityTitle: "Hongdae Indie Music Walk",
    breakdown: { unitPrice: 45000, guests: 2, serviceFee: 8500 },
  },
  {
    id: "app-3",
    status: "completed",
    dateLabel: "Sep 15, 2023",
    hostName: "Mr. Park",
    hostAvatarUrl: null,
    activityTitle: "Gwangjang Market Food Tour",
  },
];
