import { TopAppBar } from "@/components/layout/TopAppBar";
import { ChevronRightIcon, CircleHelpIcon, GlobeIcon, UserMinusIcon } from "@/components/ui/icons";
import { LogoutButton } from "./LogoutButton";
import { ProfileCard } from "./ProfileCard";

const MENU_ITEMS = [
  { label: "Language", Icon: GlobeIcon, value: "English" },
  { label: "Help Center", Icon: CircleHelpIcon },
  { label: "Delete Account", Icon: UserMinusIcon },
] as const;

interface MyPageContentProps {
  backHref: "/explore" | "/dashboard";
}

export function MyPageContent({ backHref }: Readonly<MyPageContentProps>) {
  return (
    <>
      <TopAppBar backHref={backHref} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ProfileCard />

        <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          {MENU_ITEMS.map(({ label, Icon, ...item }, index) => (
            <button
              key={label}
              type="button"
              disabled
              className={`flex cursor-not-allowed items-center gap-4 px-5 py-4 text-left opacity-60 ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <Icon className="size-5 text-ink" />
              <span className="flex-1 text-base text-ink">{label}</span>
              {"value" in item && <span className="text-sm text-ink-soft">{item.value}</span>}
              <span className="text-xs text-ink-soft">Coming soon</span>
              <ChevronRightIcon className="size-4 text-ink-soft" />
            </button>
          ))}
        </section>

        <LogoutButton />
      </main>
    </>
  );
}
