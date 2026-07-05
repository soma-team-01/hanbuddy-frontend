import { BottomNavBar } from "@/components/layout/BottomNavBar";

export default function BuddyNavLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col pb-20">
      {children}
      <BottomNavBar role="buddy" />
    </div>
  );
}
