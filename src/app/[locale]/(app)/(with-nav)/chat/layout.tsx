import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatWorkspace } from "./chat-workspace";

export default async function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("Chat");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ChatWorkspace>{children}</ChatWorkspace>
    </>
  );
}
