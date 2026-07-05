import type { Applicant, BuddyActivity, UpcomingBooking } from "@/types/buddy";

/** 서버 API 연동 전까지 사용하는 목 데이터 */
export const mockApplicants: Applicant[] = [
  {
    id: "applicant-1",
    name: "Sophie Martin",
    country: "France",
    phone: "+33 6 12 34 56 78",
    appliedDateLabel: "Oct 24, 2023",
    message:
      "Hi! I'm really looking forward to learning about traditional tea ceremonies. I've always been fascinated by Korean culture!",
    avatarUrl: null,
  },
  {
    id: "applicant-2",
    name: "James Wilson",
    country: "United States",
    phone: "+1 (555) 012-3456",
    appliedDateLabel: "Oct 24, 2023",
    message:
      "Hello! Excited for the tour. I'm a bit of a photography enthusiast, hope it's okay to take lots of pictures of the Hanok houses.",
    avatarUrl: null,
  },
  {
    id: "applicant-3",
    name: "Chloe Tan",
    country: "Singapore",
    phone: "+65 9123 4567",
    appliedDateLabel: "Oct 25, 2023",
    message:
      "Looking forward to this. I've heard Bukchon is beautiful in autumn. Is there a specific meeting spot we should head to?",
    avatarUrl: null,
  },
];

export const mockBuddyActivities: BuddyActivity[] = [
  {
    id: "tea-tasting",
    title: "Traditional Tea Tasting & Etiquette",
    description:
      "Learn the mindful practice of Korean tea preparation and tasting in a historic Hanok",
    imageUrl: "/images/activities/tea-ceremony.jpg",
    status: "active",
    bookedCount: 24,
    rating: 4.9,
    reviewCount: 18,
  },
  {
    id: "market-safari",
    title: "Gwangjang Market Food Safari",
    description:
      "Navigate the bustling alleys of Seoul's oldest market and taste authentic street food.",
    imageUrl: "/images/activities/gwangjang-market.jpg",
    status: "active",
    bookedCount: 56,
    rating: 4.8,
    reviewCount: 42,
  },
];

export const mockUpcomingBooking: UpcomingBooking = {
  activityTitle: "Gyeongbokgung Palace Tour",
  imageUrl: "/images/activities/hanok-hero.jpg",
  applicants: mockApplicants.slice(0, 2),
};

export function findBuddyActivity(id: string): BuddyActivity | undefined {
  return mockBuddyActivities.find((activity) => activity.id === id);
}
