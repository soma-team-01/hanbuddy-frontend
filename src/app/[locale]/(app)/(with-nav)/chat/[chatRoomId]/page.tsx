import { ChatRoomView } from "@/components/chat/ChatRoomView";

export default async function ChatRoomPage({
  params,
}: Readonly<{ params: Promise<{ chatRoomId: string }> }>) {
  const { chatRoomId } = await params;

  return <ChatRoomView chatRoomId={chatRoomId} />;
}
