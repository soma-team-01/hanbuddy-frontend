import { useTranslations } from "next-intl";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ChevronRightIcon, CircleHelpIcon, UserMinusIcon } from "@/components/ui/icons";
import { LanguagePreference } from "./LanguagePreference";
import { LogoutButton } from "./LogoutButton";
import { ProfileCard } from "./ProfileCard";

const UNAVAILABLE_MENU_ITEMS = [
  { messageKey: "helpCenter", Icon: CircleHelpIcon },
  { messageKey: "deleteAccount", Icon: UserMinusIcon },
] as const;

interface MyPageContentProps {
  backHref: "/explore" | "/dashboard";
}

export function MyPageContent({ backHref }: Readonly<MyPageContentProps>) {
  const t = useTranslations("MyPage");
  const tCommon = useTranslations("Common");

  return (
    <>
      <TopAppBar backHref={backHref} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ProfileCard />

        <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <LanguagePreference />
          {UNAVAILABLE_MENU_ITEMS.map(({ messageKey, Icon }) => (
            <button
              key={messageKey}
              type="button"
              disabled
              className="flex cursor-not-allowed items-center gap-4 border-t border-line px-5 py-4 text-left opacity-60"
            >
              <Icon className="size-5 text-ink" />
              <span className="flex-1 text-base text-ink">{t(messageKey)}</span>
              <span className="text-xs text-ink-soft">{tCommon("comingSoon")}</span>
              <ChevronRightIcon className="size-4 text-ink-soft" />
            </button>
          ))}
        </section>

        <LogoutButton />
      </main>
    </>
  );
}
