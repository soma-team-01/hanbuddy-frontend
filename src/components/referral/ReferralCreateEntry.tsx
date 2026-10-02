"use client";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreateActivityForm } from "@/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import { consumeReferralCode } from "@/lib/referral";
import { validateReferralInvitation } from "@/lib/api/referral";

export function ReferralCreateEntry() {
  const t = useTranslations("Referral");
  const validationId = useId();
  const [invitation, setInvitation] = useState<{ code: string | null } | null>(null);
  useEffect(() => {
    const code = consumeReferralCode();
    // Capture/erase before any validation request; never put the code in a query key.
    queueMicrotask(() => setInvitation({ code }));
  }, []);
  const query = useQuery({
    // Isolate entry lifetimes without putting the secret invitation code in the cache key.
    queryKey: ["referral", "invitation-validation", validationId],
    queryFn: async () => validateReferralInvitation(invitation!.code!),
    enabled: !!invitation?.code,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (invitation?.code && query.data?.status === "success")
    return <CreateActivityForm referral invitationCode={invitation.code} />;
  const login = query.data?.status === "unauthenticated";
  const loading = !invitation || (!!invitation.code && query.isPending);
  return (
    <PageContainer className="py-10">
      <section className="mx-auto max-w-xl rounded-2xl border border-line-soft p-6 md:p-8">
        <h1 className="text-xl font-bold">{t("invitationTitle")}</h1>
        <p role={loading ? "status" : "alert"} className="mt-4 text-sm leading-6 text-muted">
          {loading ? t("loading") : login ? t("invitationLogin") : t("invitationInvalid")}
        </p>
        {login && (
          <button
            type="button"
            onClick={() =>
              window.location.assign(
                "/api/auth/google/start?intent=buddy&locale=ko&next=%2Freferral%2Fcreate",
              )
            }
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-primary px-5 font-bold text-primary"
          >
            {t("login")}
          </button>
        )}
        {!loading && !login && (
          <>
            <p className="mt-4 text-sm text-muted">{t("checkActivities")}</p>
            <Link href="/my-activities" className="mt-3 inline-block text-primary underline">
              {t("myActivities")}
            </Link>
            {invitation?.code && (
              <button
                type="button"
                className="ml-5 text-primary underline"
                onClick={() => void query.refetch()}
              >
                {t("retry")}
              </button>
            )}
          </>
        )}
      </section>
    </PageContainer>
  );
}
