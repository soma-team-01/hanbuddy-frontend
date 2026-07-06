import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronRightIcon, CircleHelpIcon, GlobeIcon, UserMinusIcon } from "@/components/ui/icons";
import { LogoutButton } from "./LogoutButton";

const MENU_ITEMS = [
  { label: "Language", Icon: GlobeIcon, value: "English" },
  { label: "Help Center", Icon: CircleHelpIcon },
  { label: "Delete Account", Icon: UserMinusIcon },
] as const;

export default function MyPage() {
  return (
    <>
      <TopAppBar backHref="/explore" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <section className="flex items-center gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <Avatar name="Sarah Jenkins" size={72} />
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Sarah Jenkins</h1>
            <Link href="/my-page/edit" className="mt-1 flex items-center gap-1 text-sm text-earth">
              Edit Profile
              <ChevronRightIcon className="size-3.5" />
            </Link>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          {MENU_ITEMS.map(({ label, Icon, ...item }, index) => (
            <button
              key={label}
              type="button"
              className={`flex items-center gap-4 px-5 py-4 text-left ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <Icon className="size-5 text-ink" />
              <span className="flex-1 text-base text-ink">{label}</span>
              {"value" in item && <span className="text-sm text-ink-soft">{item.value}</span>}
              <ChevronRightIcon className="size-4 text-ink-soft" />
            </button>
          ))}
        </section>

        <LogoutButton />
      </main>
    </>
  );
}
