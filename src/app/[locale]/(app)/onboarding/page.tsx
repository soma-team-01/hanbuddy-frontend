import { cookies } from "next/headers";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";
import { OnboardingForm } from "./OnboardingForm";

export default async function ProfileSetupPage() {
  const cookieStore = await cookies();
  const googleProfile = decodeGoogleProfile(cookieStore.get(AUTH_COOKIES.googleProfile)?.value);

  return <OnboardingForm googleProfile={googleProfile} />;
}
