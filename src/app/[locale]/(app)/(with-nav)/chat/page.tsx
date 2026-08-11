import { getTranslations } from "next-intl/server";
import { MessageSquareIcon } from "@/components/ui/icons";

export default async function ChatIndexPage() {
  const t = await getTranslations("Chat");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-primary/40 text-primary">
        <MessageSquareIcon className="size-6" />
      </span>
      <p className="font-display text-lg font-bold text-ink">{t("selectConversation")}</p>
      <p className="max-w-sm text-sm leading-6 text-muted">{t("selectConversationDescription")}</p>
    </div>
  );
}
