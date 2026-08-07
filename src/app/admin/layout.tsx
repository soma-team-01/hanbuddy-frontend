import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/app/query-provider";
import "../globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["600", "700", "800"],
});
const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});
const korean = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HanBuddy Admin",
  description: "HanBuddy 관리자 페이지",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} ${korean.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-ink">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
