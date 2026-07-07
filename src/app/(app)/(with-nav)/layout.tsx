import { cookies } from "next/headers";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getUserTypeNavRole } from "@/lib/auth/routes";

export default async function SharedNavLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const role = getUserTypeNavRole(cookieStore.get(AUTH_COOKIES.userType)?.value);

  return (
    <div className="flex flex-1 flex-col pb-20">
      {children}
      <BottomNavBar role={role} />
    </div>
  );
}
