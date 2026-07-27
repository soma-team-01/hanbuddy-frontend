import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <PageHeader title={t("title")} backHref={backHref} />
      <PageContainer
        data-testid="my-page-layout"
        className="grid flex-1 gap-6 py-6 md:py-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start"
      >
        <main className="contents">
          <ProfileCard />

          <div className="space-y-6">
            <section className="flex flex-col overflow-hidden rounded-2xl border border-line-soft bg-panel shadow-sm">
              <LanguagePreference />
              {UNAVAILABLE_MENU_ITEMS.map(({ messageKey, Icon }) => (
                <button
                  key={messageKey}
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-4 border-t border-line-soft px-5 py-4 text-left opacity-60"
                >
                  <Icon className="size-5 text-ink" />
                  <span className="flex-1 text-base text-ink">{t(messageKey)}</span>
                  <span className="text-xs text-muted">{tCommon("comingSoon")}</span>
                  <ChevronRightIcon className="size-4 text-muted" />
                </button>
              ))}
            </section>
            <LogoutButton />
          </div>
        </main>
      </PageContainer>
    </>
  );
}
