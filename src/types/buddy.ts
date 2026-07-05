export interface Applicant {
  id: string;
  name: string;
  country: string;
  phone: string;
  appliedDateLabel: string;
  message: string;
  avatarUrl: string | null;
}

export interface BuddyActivity {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: "active";
  bookedCount: number;
  rating: number;
  reviewCount: number;
}

export interface UpcomingBooking {
  activityTitle: string;
  imageUrl: string;
  applicants: Applicant[];
}
