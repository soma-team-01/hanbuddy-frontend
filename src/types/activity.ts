export interface Host {
  name: string;
  bio: string;
  avatarUrl: string | null;
}

export interface IncludedItem {
  label: string;
  provided: boolean;
}

export interface Session {
  id: string;
  dateLabel: string;
  timeLabel: string;
  spotsLeft: number;
}

export interface MeetingPoint {
  name: string;
  area: string;
  mapImageUrl: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  district: string;
  categoryLabel: string;
  imageUrl: string;
  heroImageUrl: string;
  rating: number;
  reviewCount: number;
  /** 원화(₩) 기준 1인당 가격 */
  price: number;
  /** 할인 전 가격 (있을 때만 취소선으로 노출) */
  originalPrice?: number;
  host: Host;
  included: IncludedItem[];
  restrictions: string[];
  sessions: Session[];
  meetingPoint: MeetingPoint;
}
