export type ChatRoomType = "DIRECT" | "GROUP";

export interface ChatMessageResponse {
  messageId: number;
  senderId: number;
  senderName: string;
  senderProfileImageUrl: string | null;
  content: string;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  createdAt: string;
}

export interface ChatRoomMemberResponse {
  userId: number;
  userName: string;
  profileImageUrl: string | null;
  /** 이 참여자가 읽은 마지막 메시지 ID. 아직 읽지 않았으면 null */
  lastReadMessageId: number | null;
  /** 채팅방을 나간 참여자 */
  left: boolean;
}

export interface ChatRoomSummaryResponse {
  chatRoomId: number;
  roomType: ChatRoomType;
  /** 1:1은 상대 닉네임, 단체는 활동 제목 */
  title: string;
  /** 1:1은 상대 프로필, 단체는 활동 대표 이미지 */
  imageUrl: string | null;
  /** 단체 채팅방이 속한 활동 회차 ID. 1:1이면 null */
  activityScheduleId: number | null;
  /** 아직 대화가 없으면 null */
  lastMessage: ChatMessageResponse | null;
  unreadCount: number;
}

export interface ChatRoomDetailResponse {
  chatRoomId: number;
  roomType: ChatRoomType;
  title: string;
  activityScheduleId: number | null;
  members: ChatRoomMemberResponse[];
}

export interface ChatMessagePageResponse {
  /** 최신순으로 내려온다. 화면에는 역순으로 표시한다 */
  messages: ChatMessageResponse[];
  /** 다음 요청의 beforeMessageId. 더 과거 메시지가 없으면 null */
  nextCursor: number | null;
  hasNext: boolean;
}

export interface CreateDirectChatRoomRequest {
  targetUserId: number;
}

export interface CreateGroupChatRoomRequest {
  activityScheduleId: number;
}

export interface SendChatMessageRequest {
  /** 1~2000자 */
  content: string;
}

export interface UpdateChatReadRequest {
  lastReadMessageId: number;
}

/** WebSocket 연결용 단기 티켓. 1회용이며 수십 초 뒤 만료된다 */
export interface ChatWsTicketResponse {
  ticket: string;
  /** 남은 유효 시간(초). 값이 바뀔 수 있으므로 상수로 두지 않는다 */
  expiresIn: number;
  /** BFF가 채워 주는 SockJS 엔드포인트 주소 */
  socketUrl?: string;
}

/** `/topic/chat/rooms/{id}/read`로 오는 읽음 위치 변경 알림 */
export interface ChatReadEvent {
  chatRoomId: number;
  userId: number;
  lastReadMessageId: number;
}
