export type ChatRoomType = "DIRECT" | "GROUP";
export type ChatMessageType = "TEXT" | "IMAGE";

export interface ChatMessageResponse {
  messageId: number;
  senderId: number;
  senderName: string;
  senderProfileImageUrl: string | null;
  /** 생략되면 TEXT로 간주한다 (구버전 응답 호환) */
  messageType?: ChatMessageType;
  /** IMAGE에서는 캡션이라 비어 있을 수 있다 */
  content: string | null;
  imageUrl?: string | null;
  /** 있으면 로딩 중 레이아웃이 튀지 않는다 */
  imageWidth?: number | null;
  imageHeight?: number | null;
  /** 한 번에 보낸 묶음을 잇는 값. 단건이면 null */
  batchId?: string | null;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  createdAt: string;
}

export interface ChatRoomMemberResponse {
  userId: number;
  userName: string;
  profileImageUrl: string | null;
  /** 이 참여자가 읽은 마지막 메시지 ID. 아직 읽지 않았으면 null */
  lastReadMessageId: number | null;
  /** 합류 시점의 마지막 메시지 ID. 이보다 앞선 메시지는 이 참여자에게 보이지 않는다 */
  visibleFromMessageId?: number | null;
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
  /** 단체는 활동 대표 이미지, 1:1은 상대 프로필 */
  imageUrl?: string | null;
  /** 단체 채팅방을 만든 버디의 사용자 ID. 1:1이면 null */
  ownerId?: number | null;
  activityScheduleId: number | null;
  members: ChatRoomMemberResponse[];
}

export interface UpdateChatRoomTitleRequest {
  /** 비우면 활동 제목으로 되돌아간다. 50자 이하 */
  title: string | null;
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
  /** 생략하면 TEXT */
  messageType?: ChatMessageType;
  /** TEXT면 필수, IMAGE면 캡션(선택) */
  content?: string | null;
  /** IMAGE면 필수. presigned 발급 후 1시간 안에 보내야 한다 */
  imageKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** 같은 동작으로 보낸 메시지에 같은 UUID를 넣는다 */
  batchId?: string;
}

export interface ChatRoomImage {
  messageId: number;
  imageUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  senderId: number;
  senderName: string;
  createdAt: string;
}

export interface ChatRoomImagePageResponse {
  images: ChatRoomImage[];
  page: number;
  size: number;
  hasNext: boolean;
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
