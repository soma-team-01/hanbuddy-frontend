export type ApplicationStatus = "pending_payment" | "confirmed" | "completed";

export interface PriceBreakdown {
  unitPrice: number;
  guests: number;
  serviceFee: number;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  dateLabel: string;
  hostName: string;
  hostAvatarUrl: string | null;
  activityTitle: string;
  breakdown?: PriceBreakdown;
}
