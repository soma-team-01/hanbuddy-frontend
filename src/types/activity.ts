export type ActivityCategory = "nearby" | "popular" | "cultural" | "food";

export interface Host {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface Activity {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  rating: number;
  /** 원화(₩) 기준 가격 */
  price: number;
  categories: ActivityCategory[];
  host: Host;
}
