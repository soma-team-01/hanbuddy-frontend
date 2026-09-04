import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

export default async function AdminPage() {
  const store = await cookies();
  const isAdmin = Boolean(
    store.get(AUTH_COOKIES.accessToken)?.value &&
    store.get(AUTH_COOKIES.userType)?.value === "ADMIN",
  );
  redirect(isAdmin ? "/admin/users" : "/admin/login");
}
