import { ChatWorkspace } from "./chat-workspace";

export default function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ChatWorkspace>{children}</ChatWorkspace>;
}
