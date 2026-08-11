import { ChatRoomView } from "@/components/chat/ChatRoomView";

export default async function ChatRoomPage({
  params,
}: Readonly<{ params: Promise<{ chatRoomId: string }> }>) {
  const { chatRoomId } = await params;

  // 방을 옮기면 초안·첨부·읽음 보고 기준선까지 새로 시작해야 해서 인스턴스를 갈아 끼운다
  return <ChatRoomView key={chatRoomId} chatRoomId={chatRoomId} />;
}
