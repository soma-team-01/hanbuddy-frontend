"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

export function PolicyPageHeader({ title }: Readonly<{ title: string }>) {
  const router = useRouter();
  const locale = useLocale();

  return (
    <PageHeader
      title={title}
      compact
      onLeftClick={() => {
        if (window.history.length > 1) router.back();
        else router.replace(`/${locale}`);
      }}
    />
  );
}
