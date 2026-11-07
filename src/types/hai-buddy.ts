import type { TouristActivitySummary } from "@/types/activity";
import type { ContentLanguage } from "@/types/content-language";

/** 백엔드 HaiBuddyPage와 같은 값. */
export type HaiBuddyPage =
  | "HOME"
  | "EXPLORE"
  | "ACTIVITY_DETAIL"
  | "BOOKING"
  | "APPLICATIONS"
  | "FAQ"
  | "ABOUT"
  | "TIPS"
  | "POLICY"
  | "CHAT"
  | "MY_PAGE"
  | "OTHER";

export type HaiBuddyHandoff = "NONE" | "CONTACT";
export type HaiBuddyRole = "USER" | "ASSISTANT";
export type HaiBuddyFeedbackRating = "UP" | "DOWN";
export type HaiBuddyKnowledgeSource =
  "FAQ" | "POLICY" | "TIPS" | "STADIUM" | "CASE" | "REVIEW" | "LEARNED";

export interface HaiBuddyContext {
  page: HaiBuddyPage;
  activityId?: number;
  scheduleId?: number;
  language: ContentLanguage;
  locale: string;
}

export interface HaiBuddyMessageRequest {
  conversationId?: number;
  message: string;
  context: HaiBuddyContext;
}

export interface HaiBuddyCitation {
  citationId: string;
  source: HaiBuddyKnowledgeSource;
  title: string;
  url: string | null;
}

export interface HaiBuddyRecommendation {
  activity: TouristActivitySummary;
  nextScheduleStartAt: string | null;
}

export interface HaiBuddyReply {
  conversationId: number;
  messageId: number;
  reply: string;
  recommendedActivities: HaiBuddyRecommendation[];
  handoff: HaiBuddyHandoff;
  handoffSummary: string | null;
  citations: HaiBuddyCitation[];
}

export interface HaiBuddyMessage {
  messageId: number;
  role: HaiBuddyRole;
  content: string;
  recommendedActivities: HaiBuddyRecommendation[];
  handoff: HaiBuddyHandoff;
  handoffSummary: string | null;
  citations: HaiBuddyCitation[];
  createdAt: string;
}

export interface HaiBuddyConversation {
  conversationId: number | null;
  messages: HaiBuddyMessage[];
}
