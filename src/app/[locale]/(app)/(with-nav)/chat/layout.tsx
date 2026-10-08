import { privatePageMetadata } from "@/lib/seo/metadata";
import { ChatWorkspace } from "./chat-workspace";

export const metadata = privatePageMetadata;

export default function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ChatWorkspace>{children}</ChatWorkspace>;
}
