import type { Metadata } from "next";
import { dmSans as body, plusJakartaSans as display } from "@/styles/fonts";
import { QueryProvider } from "@/app/query-provider";
import "../globals.css";

export const metadata: Metadata = {
  title: "HanBuddy Admin",
  description: "HanBuddy 관리자 페이지",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} font-noto-sans-kr h-full antialiased`}
    >
      <body className="min-h-full bg-white text-ink">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
